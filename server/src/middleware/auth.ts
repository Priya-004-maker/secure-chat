import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "@/lib/jwt";
import { UserModel } from "@/models/user.model";

export type AuthedRequest = Request & { userId: string };

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }
  try {
    const userId = verifyToken(header.slice("Bearer ".length));
    (req as AuthedRequest).userId = userId;
    UserModel.updateOne({ _id: userId }, { $set: { lastSeenAt: new Date() } })
      .exec()
      .catch(() => {});
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
