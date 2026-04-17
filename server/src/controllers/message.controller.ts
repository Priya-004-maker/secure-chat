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

const serializeMessage = (doc: unknown) => {
  const obj =
    doc && typeof (doc as StoredMessage).toObject === "function"
      ? (doc as StoredMessage).toObject()
      : (doc as Record<string, unknown>);
  const media = obj.media as
    | { key?: string; thumbnailKey?: string; [k: string]: unknown }
    | null
    | undefined;
  if (media && media.key) {
    const enriched: Record<string, unknown> = { ...media, url: publicUrlFor(media.key) };
    if (media.thumbnailKey) {
      enriched.thumbnailUrl = publicUrlFor(media.thumbnailKey);
    }
    return { ...obj, media: enriched };
  }
  return obj;
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
  const { recipientId, content, media } = req.body ?? {};
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

  const message = await MessageModel.create({
    sender: req.userId,
    recipient: recipientId,
    content: text,
    media: parsed?.media ?? null,
  });

  res.status(201).json(serializeMessage(message));
};

export const getConversation = async (req: AuthedRequest, res: Response) => {
  const { otherUserId } = req.params;
  if (!otherUserId || !Types.ObjectId.isValid(otherUserId)) {
    res.status(400).json({ error: "valid otherUserId is required" });
    return;
  }

  await MessageModel.updateMany(
    { sender: otherUserId, recipient: req.userId, seenAt: null },
    { $set: { seenAt: new Date() } },
  );

  const messages = await MessageModel.find({
    $or: [
      { sender: req.userId, recipient: otherUserId },
      { sender: otherUserId, recipient: req.userId },
    ],
  })
    .sort({ sentAt: 1 })
    .limit(200);

  res.json(messages.map(serializeMessage));
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
