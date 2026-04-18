import AsyncStorage from "@react-native-async-storage/async-storage";
import { fromBase64, toBase64 } from "./encoding";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const TOKEN_KEY = "auth-token";

export type User = {
  id: string;
  name?: string;
  email: string;
  lastSeenAt?: string;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type MediaType = "image" | "video" | "audio";

export type MessageMedia = {
  type: MediaType;
  url: string;
  key: string;
  mimeType: string;
  size?: number;
  width?: number;
  height?: number;
  durationMs?: number;
  thumbnailUrl?: string;
  thumbnailKey?: string;
};

export type ReplyPreview = {
  _id: string;
  sender: string;
  recipient: string;
  content: string;
  media: MessageMedia | null;
  sentAt: string;
};

export type Message = {
  _id: string;
  sender: string;
  recipient: string;
  content: string;
  media: MessageMedia | null;
  replyTo?: ReplyPreview | null;
  sentAt: string;
  seenAt: string | null;
};

export type Conversation = {
  userId: string;
  name?: string;
  email: string;
  lastSeenAt?: string;
  lastMessage: string;
  lastMediaType?: MediaType | null;
  lastAt: string;
  lastSender: string;
  lastMessageSeenAt: string | null;
  unreadCount: number;
};

export type PresignResponse = {
  uploadUrl: string;
  key: string;
  expiresIn: number;
};

export type OutgoingMedia = Omit<MessageMedia, "url" | "thumbnailUrl">;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  if (!BASE_URL) throw new ApiError(0, "EXPO_PUBLIC_API_URL is not set");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Tunnel-Skip-AntiPhishing-Page": "true",
  };
  if (options.auth !== false) {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (err) {
    throw new ApiError(0, err instanceof Error ? err.message : "Network error");
  }

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : res.statusText || "Request failed";
    throw new ApiError(res.status, message);
  }

  return data as T;
}

export const tokenStore = {
  get: () => AsyncStorage.getItem(TOKEN_KEY),
  set: (token: string) => AsyncStorage.setItem(TOKEN_KEY, token),
  clear: () => AsyncStorage.removeItem(TOKEN_KEY),
};

export const auth = {
  signup: (input: { name?: string; email: string; password: string }) =>
    request<AuthResponse>("/api/auth/signup", {
      method: "POST",
      body: input,
      auth: false,
    }),
  login: (input: { email: string; password: string }) =>
    request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: input,
      auth: false,
    }),
};

const decodeMessage = (m: Message): Message => ({
  ...m,
  content: m.content ? fromBase64(m.content) : "",
  replyTo: m.replyTo
    ? {
        ...m.replyTo,
        content: m.replyTo.content ? fromBase64(m.replyTo.content) : "",
      }
    : null,
});

export type MessagesPage = {
  messages: Message[];
  nextCursor: string | null;
  hasMore: boolean;
};

export const messages = {
  list: async (
    otherUserId: string,
    opts: { before?: string; limit?: number } = {},
  ): Promise<MessagesPage> => {
    const params = new URLSearchParams();
    if (opts.before) params.set("before", opts.before);
    if (opts.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    const data = await request<{
      messages: Message[];
      nextCursor: string | null;
      hasMore: boolean;
    }>(`/api/messages/${otherUserId}${qs ? `?${qs}` : ""}`);
    return {
      messages: data.messages.map(decodeMessage),
      nextCursor: data.nextCursor,
      hasMore: data.hasMore,
    };
  },
  send: async (input: {
    recipientId: string;
    content?: string;
    media?: OutgoingMedia;
    replyTo?: string;
  }) => {
    const body: Record<string, unknown> = { recipientId: input.recipientId };
    if (input.content) body.content = toBase64(input.content);
    if (input.media) body.media = input.media;
    if (input.replyTo) body.replyTo = input.replyTo;
    const msg = await request<Message>("/api/messages", {
      method: "POST",
      body,
    });
    return decodeMessage(msg);
  },
  conversations: async () => {
    const data = await request<Conversation[]>("/api/messages/conversations");
    return data.map((c) => ({
      ...c,
      lastMessage: c.lastMessage ? fromBase64(c.lastMessage) : "",
    }));
  },
  delete: (messageId: string) =>
    request<{ id: string }>(`/api/messages/${messageId}`, { method: "DELETE" }),
};

export const uploads = {
  presign: (input: { type: MediaType; contentType: string; ext?: string; size?: number }) =>
    request<PresignResponse>("/api/uploads/presign", {
      method: "POST",
      body: input,
    }),
};

const defaultMimeFor = (type: MediaType) =>
  type === "image" ? "image/jpeg" : type === "video" ? "video/mp4" : "audio/mpeg";

const defaultExtFor = (type: MediaType) =>
  type === "image" ? "jpg" : type === "video" ? "mp4" : "mp3";

export async function uploadMediaAsset(
  type: MediaType,
  asset: {
    uri: string;
    mimeType?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
    width?: number;
    height?: number;
    duration?: number | null;
  },
): Promise<OutgoingMedia> {
  const mimeType = asset.mimeType || defaultMimeFor(type);
  const ext = (
    asset.fileName?.split(".").pop() ||
    mimeType.split("/")[1] ||
    defaultExtFor(type)
  ).toLowerCase();

  const presignBody: { type: MediaType; contentType: string; ext: string; size?: number } = {
    type,
    contentType: mimeType,
    ext,
  };
  if (typeof asset.fileSize === "number") presignBody.size = asset.fileSize;

  const presigned = await uploads.presign(presignBody);

  const fileRes = await fetch(asset.uri);
  const blob = await fileRes.blob();

  const putRes = await fetch(presigned.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: blob,
  });
  if (!putRes.ok) {
    throw new ApiError(putRes.status, `Failed to upload ${type} to storage`);
  }

  const media: OutgoingMedia = {
    type,
    key: presigned.key,
    mimeType,
    size: typeof asset.fileSize === "number" ? asset.fileSize : blob.size,
  };
  if (typeof asset.width === "number") media.width = asset.width;
  if (typeof asset.height === "number") media.height = asset.height;
  if (typeof asset.duration === "number") media.durationMs = Math.round(asset.duration);
  return media;
}

export const users = {
  searchByEmail: (email: string) =>
    request<User>(`/api/users/search?email=${encodeURIComponent(email)}`),
  getById: (id: string) => request<User>(`/api/users/${id}`),
  updateProfile: (input: { name?: string; email?: string }) =>
    request<User>("/api/users/me", { method: "PATCH", body: input }),
  changePassword: (input: { currentPassword: string; newPassword: string }) =>
    request<{ ok: true }>("/api/users/me/password", {
      method: "PATCH",
      body: input,
    }),
};
