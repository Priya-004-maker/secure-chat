import { randomUUID } from "node:crypto";
import {
  S3Client,
  DeleteObjectCommand,
  PutObjectCommand,
  GetBucketLifecycleConfigurationCommand,
  PutBucketLifecycleConfigurationCommand,
  type LifecycleRule,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.AWS_REGION;
const bucket = process.env.AWS_BUCKET_NAME;
const prefix = (process.env.AWS_BUCKET_PREFIX || "").replace(/^\/+|\/+$/g, "");
const cdnUrl = (process.env.AWS_CDN_URL || "").replace(/\/+$/, "");

// Stored keys are relative (e.g. "image/123-uuid.jpg"). Apply the configured
// bucket prefix only when talking to S3 or building public URLs.
const toS3Key = (relativeKey: string) =>
  prefix ? `${prefix}/${relativeKey}` : relativeKey;

if (!region || !bucket) {
  console.warn("[s3] AWS_REGION / AWS_BUCKET_NAME not set — uploads will fail");
}

const clientConfig: { region?: string; credentials?: { accessKeyId: string; secretAccessKey: string } } = {};
if (region) clientConfig.region = region;
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  clientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}
export const s3 = new S3Client(clientConfig);

export const MEDIA_RETENTION_DAYS = 90;
const LIFECYCLE_RULE_ID = "securechat-media-90d-expiry";

const buildKey = (userId: string, type: string, ext: string) => {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 8);
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "");
  const filename = `${Date.now()}-${randomUUID()}${safeExt ? "." + safeExt : ""}`;
  return [safeUserId, type, filename].filter(Boolean).join("/");
};

export const publicUrlFor = (key: string) => {
  if (!key) return "";
  const fullKey = toS3Key(key);
  if (cdnUrl) return `${cdnUrl}/${fullKey}`;
  return `https://${bucket}.s3.${region}.amazonaws.com/${fullKey}`;
};

export const avatarKeyFor = (userId: string) => `${userId}/avatar`;

export const avatarUrlFor = (value?: string | null) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return publicUrlFor(value);
};

export async function createAvatarUploadUrl({
  userId,
  contentType,
}: {
  userId: string;
  contentType: string;
}) {
  if (!bucket) throw new Error("AWS_BUCKET_NAME is not configured");
  if (!userId) throw new Error("userId is required to build an upload key");
  const key = avatarKeyFor(userId);
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: toS3Key(key),
    ContentType: contentType,
    CacheControl: "no-cache",
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });
  return { uploadUrl, key, expiresIn: 60 * 5 };
}

export type PresignInput = {
  userId: string;
  type: "image" | "video" | "audio";
  contentType: string;
  ext?: string;
};

export async function createUploadUrl({ userId, type, contentType, ext }: PresignInput) {
  if (!bucket) throw new Error("AWS_BUCKET_NAME is not configured");
  if (!userId) throw new Error("userId is required to build an upload key");
  const key = buildKey(userId, type, ext || "");
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: toS3Key(key),
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });
  return {
    uploadUrl,
    key,
    expiresIn: 60 * 5,
  };
}

export async function deleteObject(key: string) {
  if (!bucket || !key) return;
  await s3.send(
    new DeleteObjectCommand({ Bucket: bucket, Key: toS3Key(key) }),
  );
}

export async function ensureMediaLifecycle() {
  if (!bucket) return;
  const desiredRule: LifecycleRule = {
    ID: LIFECYCLE_RULE_ID,
    Status: "Enabled",
    Filter: { Prefix: prefix ? `${prefix}/` : "" },
    Expiration: { Days: MEDIA_RETENTION_DAYS },
  };

  let existing: LifecycleRule[] = [];
  try {
    const res = await s3.send(
      new GetBucketLifecycleConfigurationCommand({ Bucket: bucket }),
    );
    existing = res.Rules ?? [];
  } catch (err) {
    const code = (err as { name?: string; Code?: string }).name ||
      (err as { Code?: string }).Code;
    if (code !== "NoSuchLifecycleConfiguration") {
      console.warn("[s3] failed to read lifecycle config:", err);
      return;
    }
  }

  const filtered = existing.filter((r) => r.ID !== LIFECYCLE_RULE_ID);
  const merged = [...filtered, desiredRule];

  const sameRule = existing.find((r) => r.ID === LIFECYCLE_RULE_ID);
  if (
    sameRule &&
    sameRule.Status === "Enabled" &&
    sameRule.Expiration?.Days === MEDIA_RETENTION_DAYS &&
    sameRule.Filter?.Prefix === desiredRule.Filter?.Prefix
  ) {
    return;
  }

  try {
    await s3.send(
      new PutBucketLifecycleConfigurationCommand({
        Bucket: bucket,
        LifecycleConfiguration: { Rules: merged },
      }),
    );
    console.log(`[s3] lifecycle rule '${LIFECYCLE_RULE_ID}' applied (${MEDIA_RETENTION_DAYS}d)`);
  } catch (err) {
    console.warn("[s3] failed to apply lifecycle rule:", err);
  }
}
