import type { Response } from "express";
import { createUploadUrl } from "@/lib/s3";
import type { AuthedRequest } from "@/middleware/auth";

const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

const ALLOWED_VIDEO_MIME = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
  "video/3gpp",
]);

const ALLOWED_AUDIO_MIME = new Set([
  "audio/mp4",
  "audio/mpeg",
  "audio/aac",
  "audio/m4a",
  "audio/x-m4a",
  "audio/ogg",
  "audio/webm",
  "audio/wav",
  "audio/3gpp",
]);

const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB

export const presignUpload = async (req: AuthedRequest, res: Response) => {
  const { type, contentType, ext, size } = req.body ?? {};

  if (type !== "image" && type !== "video" && type !== "audio") {
    res.status(400).json({
      error: "type must be 'image', 'video', or 'audio'",
    });
    return;
  }
  if (typeof contentType !== "string") {
    res.status(400).json({ error: "contentType is required" });
    return;
  }

  if (type === "image") {
    if (!ALLOWED_IMAGE_MIME.has(contentType)) {
      res.status(400).json({ error: "unsupported image content type" });
      return;
    }
    if (typeof size === "number" && size > MAX_IMAGE_BYTES) {
      res.status(400).json({ error: "image exceeds 15 MB limit" });
      return;
    }
  } else if (type === "video") {
    if (!ALLOWED_VIDEO_MIME.has(contentType)) {
      res.status(400).json({ error: "unsupported video content type" });
      return;
    }
    if (typeof size === "number" && size > MAX_VIDEO_BYTES) {
      res.status(400).json({ error: "video exceeds 100 MB limit" });
      return;
    }
  } else {
    if (!ALLOWED_AUDIO_MIME.has(contentType)) {
      res.status(400).json({ error: "unsupported audio content type" });
      return;
    }
    if (typeof size === "number" && size > MAX_AUDIO_BYTES) {
      res.status(400).json({ error: "audio exceeds 25 MB limit" });
      return;
    }
  }

  try {
    const presigned = await createUploadUrl({
      userId: req.userId,
      type,
      contentType,
      ext: typeof ext === "string" ? ext : "",
    });
    res.json(presigned);
  } catch (err) {
    console.error("[uploads] presign failed", err);
    res.status(500).json({ error: "failed to create upload url" });
  }
};
