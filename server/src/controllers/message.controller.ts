import type { Response } from "express";
import { Types } from "mongoose";
import { MessageModel } from "@/models/message.model";
import type { AuthedRequest } from "@/middleware/auth";

export const sendMessage = async (req: AuthedRequest, res: Response) => {
  const { recipientId, content } = req.body ?? {};
  if (!recipientId || !Types.ObjectId.isValid(recipientId)) {
    res.status(400).json({ error: "valid recipientId is required" });
    return;
  }
  if (typeof content !== "string" || !content.trim()) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  const message = await MessageModel.create({
    sender: req.userId,
    recipient: recipientId,
    content: content.trim(),
  });

  res.status(201).json(message);
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

  res.json(messages);
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
