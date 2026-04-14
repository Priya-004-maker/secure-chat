import type { Response } from "express";
import { Types } from "mongoose";
import { UserModel } from "@/models/user.model";
import type { AuthedRequest } from "@/middleware/auth";

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
    lastSeenAt: user.lastSeenAt,
  });
};
