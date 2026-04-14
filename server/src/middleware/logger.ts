import type { Request, Response, NextFunction } from "express";

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(`[${req.method}] ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
};

export const errorLogger = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[ERROR] ${req.method} ${req.originalUrl} -> ${message}`);
  if (!res.headersSent) {
    res.status(500).json({ error: message || "Internal server error" });
  }
};
