import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { UserModel } from "@/models/user.model";
import { signToken } from "@/lib/jwt";

export const signup = async (req: Request, res: Response) => {
  const { name, email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }
  if (typeof password !== "string" || password.length < 6 || password.length > 10) {
    res.status(400).json({ error: "password must be between 6 and 10 characters" });
    return;
  }

  const existing = await UserModel.findOne({ email: String(email).toLowerCase() });
  if (existing) {
    res.status(409).json({ error: "email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await UserModel.create({ name, email, password: passwordHash });
  const token = signToken(user.id);

  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const user = await UserModel.findOne({ email: String(email).toLowerCase() }).select(
    "+password",
  );
  if (!user) {
    res.status(401).json({ error: "invalid credentials" });
    return;
  }

  const ok = await bcrypt.compare(String(password), user.password);
  if (!ok) {
    res.status(401).json({ error: "invalid credentials" });
    return;
  }

  const token = signToken(user.id);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
};
