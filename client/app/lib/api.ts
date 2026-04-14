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

export type Message = {
  _id: string;
  sender: string;
  recipient: string;
  content: string;
  sentAt: string;
  seenAt: string | null;
};

export type Conversation = {
  userId: string;
  name?: string;
  email: string;
  lastSeenAt?: string;
  lastMessage: string;
  lastAt: string;
  lastSender: string;
  lastMessageSeenAt: string | null;
  unreadCount: number;
};

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
  content: fromBase64(m.content),
});

export const messages = {
  list: async (otherUserId: string) => {
    const data = await request<Message[]>(`/api/messages/${otherUserId}`);
    return data.map(decodeMessage);
  },
  send: async (input: { recipientId: string; content: string }) => {
    const msg = await request<Message>("/api/messages", {
      method: "POST",
      body: { recipientId: input.recipientId, content: toBase64(input.content) },
    });
    return decodeMessage(msg);
  },
  conversations: async () => {
    const data = await request<Conversation[]>("/api/messages/conversations");
    return data.map((c) => ({ ...c, lastMessage: fromBase64(c.lastMessage) }));
  },
};

export const users = {
  searchByEmail: (email: string) =>
    request<User>(`/api/users/search?email=${encodeURIComponent(email)}`),
  getById: (id: string) => request<User>(`/api/users/${id}`),
};
