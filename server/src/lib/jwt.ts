import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
};

export const signToken = (userId: string) => {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"],
  };
  return jwt.sign({ sub: userId }, getSecret(), options);
};

export const verifyToken = (token: string) => {
  const payload = jwt.verify(token, getSecret());
  if (typeof payload === "string" || !payload.sub) {
    throw new Error("Invalid token payload");
  }
  return String(payload.sub);
};
