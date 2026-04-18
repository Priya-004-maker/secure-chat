import type { Response } from "express";
import { Types } from "mongoose";
import { MEDIA_TYPES, MessageModel, type MediaType } from "@/models/message.model";
import { deleteObject, publicUrlFor } from "@/lib/s3";
import type { AuthedRequest } from "@/middleware/auth";

type IncomingMedia = {
  type?: unknown;
  key?: unknown;
  mimeType?: unknown;
  size?: unknown;
  width?: unknown;
  height?: unknown;
  durationMs?: unknown;
  thumbnailKey?: unknown;
};

type StoredMessage = {
  toObject: () => Record<string, unknown>;
};

const enrichMedia = (media: unknown) => {
  if (!media || typeof media !== "object") return media;
  const m = media as { key?: string; thumbnailKey?: string; [k: string]: unknown };
  if (!m.key) return m;
  const enriched: Record<string, unknown> = { ...m, url: publicUrlFor(m.key) };
  if (m.thumbnailKey) enriched.thumbnailUrl = publicUrlFor(m.thumbnailKey);
  return enriched;
};

const serializeMessage = (doc: unknown): Record<string, unknown> => {
  const obj =
    doc && typeof (doc as StoredMessage).toObject === "function"
      ? (doc as StoredMessage).toObject()
      : (doc as Record<string, unknown>);
  const out: Record<string, unknown> = { ...obj, media: enrichMedia(obj.media) };
  if (obj.replyTo && typeof obj.replyTo === "object") {
    const reply = obj.replyTo as Record<string, unknown>;
    out.replyTo = { ...reply, media: enrichMedia(reply.media) };
  }
  return out;
};

const parseMedia = (raw: unknown) => {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as IncomingMedia;
  if (typeof m.type !== "string" || !MEDIA_TYPES.includes(m.type as MediaType)) {
    return { error: "media.type must be image, video, or audio" as const };
  }
  if (m.type !== "image" && m.type !== "video" && m.type !== "audio") {
    return { error: "unsupported media type" as const };
  }
  if (typeof m.key !== "string" || !m.key) return { error: "media.key is required" as const };
  if (typeof m.mimeType !== "string" || !m.mimeType) {
    return { error: "media.mimeType is required" as const };
  }
  const media: Record<string, unknown> = {
    type: m.type as MediaType,
    key: m.key,
    mimeType: m.mimeType,
    size: typeof m.size === "number" ? m.size : 0,
  };
  if (typeof m.width === "number") media.width = m.width;
  if (typeof m.height === "number") media.height = m.height;
  if (typeof m.durationMs === "number") media.durationMs = m.durationMs;
  if (typeof m.thumbnailKey === "string" && m.thumbnailKey) {
    media.thumbnailKey = m.thumbnailKey;
  }
  return { media };
};

export const deleteMessage = async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  if (!id || !Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: "valid message id is required" });
    return;
  }

  const message = await MessageModel.findById(id);
  if (!message) {
    res.status(404).json({ error: "message not found" });
    return;
  }

  if (String(message.sender) !== req.userId) {
    res.status(403).json({ error: "only the sender can delete this message" });
    return;
  }

  const mediaKey = message.media?.key;
  const thumbnailKey = message.media?.thumbnailKey;
  await message.deleteOne();
  for (const key of [mediaKey, thumbnailKey]) {
    if (!key) continue;
    deleteObject(key).catch((err) =>
      console.warn("[messages] failed to delete media object", key, err),
    );
  }
  res.json({ id });
};

export const sendMessage = async (req: AuthedRequest, res: Response) => {
  const { recipientId, content, media, replyTo } = req.body ?? {};
  if (!recipientId || !Types.ObjectId.isValid(recipientId)) {
    res.status(400).json({ error: "valid recipientId is required" });
    return;
  }

  const text = typeof content === "string" ? content.trim() : "";
  const parsed = media != null ? parseMedia(media) : null;

  if (parsed && "error" in parsed) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  if (!text && !parsed?.media) {
    res.status(400).json({ error: "content or media is required" });
    return;
  }

  let replyToId: Types.ObjectId | null = null;
  if (replyTo != null) {
    if (typeof replyTo !== "string" || !Types.ObjectId.isValid(replyTo)) {
      res.status(400).json({ error: "invalid replyTo id" });
      return;
    }
    const parent = await MessageModel.findById(replyTo).select("sender recipient");
    if (!parent) {
      res.status(404).json({ error: "reply target not found" });
      return;
    }
    const participants = [String(parent.sender), String(parent.recipient)];
    if (!participants.includes(req.userId) || !participants.includes(String(recipientId))) {
      res.status(403).json({ error: "cannot reply to a message from another conversation" });
      return;
    }
    replyToId = parent._id;
  }

  const created = await MessageModel.create({
    sender: req.userId,
    recipient: recipientId,
    content: text,
    media: parsed?.media ?? null,
    replyTo: replyToId,
  });

  const message = await MessageModel.findById(created._id).populate({
    path: "replyTo",
    select: "sender recipient content media sentAt",
  });

  res.status(201).json(serializeMessage(message));
};

export const getConversation = async (req: AuthedRequest, res: Response) => {
  const { otherUserId } = req.params;
  if (!otherUserId || !Types.ObjectId.isValid(otherUserId)) {
    res.status(400).json({ error: "valid otherUserId is required" });
    return;
  }

  const rawLimit = Number(req.query.limit);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 100) : 50;

  const before = typeof req.query.before === "string" ? req.query.before : "";
  if (before && !Types.ObjectId.isValid(before)) {
    res.status(400).json({ error: "invalid before cursor" });
    return;
  }

  await MessageModel.updateMany(
    { sender: otherUserId, recipient: req.userId, seenAt: null },
    { $set: { seenAt: new Date() } },
  );

  const filter: Record<string, unknown> = {
    $or: [
      { sender: req.userId, recipient: otherUserId },
      { sender: otherUserId, recipient: req.userId },
    ],
  };
  if (before) filter._id = { $lt: new Types.ObjectId(before) };

  const page = await MessageModel.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .populate({ path: "replyTo", select: "sender recipient content media sentAt" });

  const hasMore = page.length > limit;
  const slice = hasMore ? page.slice(0, limit) : page;
  const messages = slice.reverse().map(serializeMessage);
  const nextCursor = hasMore ? String(slice[0]?._id) : null;

  res.json({ messages, nextCursor, hasMore });
};

export const listConversations = async (req: AuthedRequest, res: Response) => {
  const uid = new Types.ObjectId(req.userId);

  const convos = await MessageModel.aggregate([
    { $match: { $or: [{ sender: uid }, { recipient: uid }] } },
    {
      $addFields: {
        otherUser: {
          $cond: [{ $eq: ["$sender", uid] }, "$recipient", "$sender"],
        },
      },
    },
    { $sort: { sentAt: -1 } },
    {
      $group: {
        _id: "$otherUser",
        lastMessage: { $first: "$content" },
        lastMediaType: { $first: "$media.type" },
        lastAt: { $first: "$sentAt" },
        lastSender: { $first: "$sender" },
        lastSeen: { $first: "$seenAt" },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$sender", uid] },
                  { $eq: ["$seenAt", null] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        _id: 0,
        userId: "$_id",
        name: "$user.name",
        email: "$user.email",
        lastSeenAt: "$user.lastSeenAt",
        lastMessage: 1,
        lastMediaType: 1,
        lastAt: 1,
        lastSender: 1,
        lastMessageSeenAt: "$lastSeen",
        unreadCount: 1,
      },
    },
    { $sort: { lastAt: -1 } },
  ]);

  res.json(convos);
};
