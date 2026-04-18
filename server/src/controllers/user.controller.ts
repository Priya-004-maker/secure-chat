import type { Response } from "express";
import { Types } from "mongoose";
import bcrypt from "bcryptjs";
import { UserModel } from "@/models/user.model";
import {
  avatarKeyFor,
  avatarUrlFor,
  createAvatarUploadUrl,
} from "@/lib/s3";
import type { AuthedRequest } from "@/middleware/auth";

const ALLOWED_AVATAR_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export const searchByEmail = async (req: AuthedRequest, res: Response) => {
  const email = String(req.query.email ?? "")
    .toLowerCase()
    .trim();
  if (!email) {
    res.status(400).json({ error: "email query param is required" });
    return;
  }
  const user = await UserModel.findOne({ email });
  if (!user) {
    res.status(404).json({ error: "user not found" });
    return;
  }
  if (user.id === req.userId) {
    res.status(400).json({ error: "cannot start a chat with yourself" });
    return;
  }
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: avatarUrlFor(user.avatar),
    lastSeenAt: user.lastSeenAt,
  });
};

export const getById = async (req: AuthedRequest, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id ?? "")) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const user = await UserModel.findById(req.params.id);
  if (!user) {
    res.status(404).json({ error: "user not found" });
    return;
  }
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: avatarUrlFor(user.avatar),
    lastSeenAt: user.lastSeenAt,
  });
};

export const updateProfile = async (req: AuthedRequest, res: Response) => {
  const { name, email, avatar } = req.body ?? {};
  const update: Record<string, string> = {};

  if (name !== undefined) {
    if (typeof name !== "string") {
      res.status(400).json({ error: "name must be a string" });
      return;
    }
    update.name = name.trim();
  }

  if (email !== undefined) {
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "invalid email" });
      return;
    }
    const normalized = email.toLowerCase().trim();
    const existing = await UserModel.findOne({ email: normalized });
    if (existing && existing.id !== req.userId) {
      res.status(409).json({ error: "email already in use" });
      return;
    }
    update.email = normalized;
  }

  if (avatar !== undefined) {
    res.status(400).json({
      error: "avatar cannot be set here — use /users/me/avatar/presign then /users/me/avatar",
    });
    return;
  }

  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: "no fields to update" });
    return;
  }

  const user = await UserModel.findByIdAndUpdate(req.userId, { $set: update }, { new: true });
  if (!user) {
    res.status(404).json({ error: "user not found" });
    return;
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: avatarUrlFor(user.avatar),
    lastSeenAt: user.lastSeenAt,
  });
};

export const changePassword = async (req: AuthedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body ?? {};

  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    res.status(400).json({ error: "currentPassword and newPassword are required" });
    return;
  }

  if (newPassword.length < 6 || newPassword.length > 10) {
    res.status(400).json({ error: "newPassword must be between 6 and 10 characters" });
    return;
  }

  if (newPassword === currentPassword) {
    res.status(400).json({ error: "newPassword must differ from currentPassword" });
    return;
  }

  const user = await UserModel.findById(req.userId).select("+password");
  if (!user) {
    res.status(404).json({ error: "user not found" });
    return;
  }

  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) {
    res.status(401).json({ error: "current password is incorrect" });
    return;
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.json({ ok: true });
};

export const presignAvatar = async (req: AuthedRequest, res: Response) => {
  const { contentType, size } = req.body ?? {};

  if (typeof contentType !== "string" || !ALLOWED_AVATAR_MIME.has(contentType)) {
    res.status(400).json({ error: "unsupported avatar content type" });
    return;
  }
  if (typeof size === "number" && size > MAX_AVATAR_BYTES) {
    res.status(400).json({ error: "avatar exceeds 5 MB limit" });
    return;
  }

  try {
    const presigned = await createAvatarUploadUrl({
      userId: req.userId,
      contentType,
    });
    res.json(presigned);
  } catch (err) {
    console.error("[avatar] presign failed", err);
    res.status(500).json({ error: "failed to create upload url" });
  }
};

export const confirmAvatar = async (req: AuthedRequest, res: Response) => {
  const key = avatarKeyFor(req.userId);
  const user = await UserModel.findByIdAndUpdate(
    req.userId,
    { $set: { avatar: key } },
    { new: true },
  );
  if (!user) {
    res.status(404).json({ error: "user not found" });
    return;
  }
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: avatarUrlFor(user.avatar),
    lastSeenAt: user.lastSeenAt,
  });
};
