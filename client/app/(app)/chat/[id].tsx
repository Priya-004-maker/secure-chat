import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import {
  messages as messagesApi,
  users,
  ApiError,
  type Message,
  type User,
} from "../../lib/api";
import { formatLastSeen, isOnline } from "../../lib/presence";
import {
  EmojiPicker,
  emojiData,
} from "@hiraku-ai/react-native-emoji-picker";

function initials(name?: string, email?: string) {
  const source = (name ?? email ?? "").trim();
  if (!source) return "";
  const parts = source.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Avatar({
  text,
  size = 36,
  online = false,
}: {
  text: string;
  size?: number;
  online?: boolean;
}) {
  const dot = Math.max(9, Math.round(size * 0.28));
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{ width: size, height: size, borderRadius: size / 2 }}
        className="bg-accent items-center justify-center"
      >
        {text ? (
          <Text
            style={{ fontSize: size * 0.36 }}
            className="text-white font-semibold"
          >
            {text}
          </Text>
        ) : (
          <Ionicons name="person" size={size * 0.55} color="#fff" />
        )}
      </View>
      {online ? (
        <View
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            borderWidth: 2,
            borderColor: "#111B21",
          }}
          className="bg-green-500"
        />
      ) : null}
    </View>
  );
}

function MessageBubble({
  message,
  isOwn,
  onLongPress,
}: {
  message: Message;
  isOwn: boolean;
  onLongPress?: () => void;
}) {
  const seen = isOwn && !!message.seenAt;
  return (
    <View className={`px-3 mb-1 ${isOwn ? "items-end" : "items-start"}`}>
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={onLongPress}
        delayLongPress={300}
        disabled={!onLongPress}
        className={`max-w-[80%] rounded-xl px-3 py-2 ${
          isOwn ? "bg-bubble-own rounded-tr-sm" : "bg-bubble-other rounded-tl-sm"
        }`}
      >
        <Text className="text-dark-text text-[15px] leading-5">
          {message.content}
        </Text>
        <View className="flex-row items-center self-end mt-0.5 gap-1">
          <Text
            className={`text-[10px] ${
              isOwn ? "text-blue-300" : "text-dark-muted"
            }`}
          >
            {formatMessageTime(message.sentAt)}
          </Text>
          {isOwn ? (
            <Ionicons
              name={seen ? "checkmark-done" : "checkmark"}
              size={14}
              color={seen ? "#60A5FA" : "#93C5FD"}
            />
          ) : null}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const POLL_INTERVAL_MS = 3000;

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [other, setOther] = useState<User | null>(null);
  const [items, setItems] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [pickerVisible, setPickerVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const fetchMessages = useCallback(async () => {
    if (!id) return;
    try {
      const data = await messagesApi.list(id);
      setItems([...data].reverse());
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    }
  }, [id]);

  const refreshOther = useCallback(async () => {
    if (!id) return;
    try {
      const profile = await users.getById(id);
      setOther(profile);
    } catch {
      // ignore transient errors
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [profile] = await Promise.all([users.getById(id), fetchMessages()]);
        if (!cancelled) setOther(profile);
      } catch (err) {
        if (!cancelled && err instanceof ApiError) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, fetchMessages]);

  useEffect(() => {
    if (!id) return;
    const timer = setInterval(() => {
      fetchMessages();
      refreshOther();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [id, fetchMessages, refreshOther]);

  const confirmDelete = (messageId: string) => {
    Alert.alert("Delete message", "This will remove the message for everyone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const prev = items;
          setItems((curr) => curr.filter((m) => m._id !== messageId));
          try {
            await messagesApi.delete(messageId);
          } catch (err) {
            setItems(prev);
            if (err instanceof ApiError) setError(err.message);
          }
        },
      },
    ]);
  };

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || !id || sending) return;
    setSending(true);
    setInput("");
    try {
      const created = await messagesApi.send({ recipientId: id, content });
      setItems((prev) => [created, ...prev]);
    } catch (err) {
      setInput(content);
      if (err instanceof ApiError) setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (!id) {
    return (
      <View className="flex-1 bg-dark-bg items-center justify-center">
        <Text className="text-dark-muted">Chat not found</Text>
      </View>
    );
  }

  const displayName = other?.name || other?.email || "Loading...";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-dark-bg"
    >
      <View
        style={{ paddingTop: insets.top + 8 }}
        className="bg-dark-surface pb-2 px-2 flex-row items-center"
      >
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#E9EDEF" />
        </TouchableOpacity>
        <Avatar
          text={initials(other?.name, other?.email)}
          size={40}
          online={isOnline(other?.lastSeenAt)}
        />
        <View className="ml-3 flex-1">
          <Text
            className="text-dark-text text-base font-semibold"
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {other ? (
            <Text
              className={`text-xs ${
                isOnline(other.lastSeenAt) ? "text-green-400" : "text-dark-muted"
              }`}
              numberOfLines={1}
            >
              {formatLastSeen(other.lastSeenAt)}
            </Text>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={items}
          keyExtractor={(item) => item._id}
          inverted
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={({ item }) => {
            const isOwn = item.sender === user?.id;
            return (
              <MessageBubble
                message={item}
                isOwn={isOwn}
                onLongPress={isOwn ? () => confirmDelete(item._id) : undefined}
              />
            );
          }}
          ListEmptyComponent={
            <View className="items-center justify-center pt-20 px-8">
              <Text className="text-dark-muted text-sm text-center">
                No messages yet. Say hi!
              </Text>
            </View>
          }
        />
      )}

      {error ? (
        <Text className="text-red-400 text-xs text-center py-1">{error}</Text>
      ) : null}

      <View
        style={{ paddingBottom: Math.max(insets.bottom, 8) }}
        className="bg-dark-surface px-2 py-2 flex-row items-end"
      >
        <View className="flex-1 flex-row items-center bg-dark-input rounded-2xl px-2 py-1 mx-1">
          <TouchableOpacity
            className="p-1.5"
            onPress={() => {
              if (pickerVisible) {
                setPickerVisible(false);
                inputRef.current?.focus();
              } else {
                Keyboard.dismiss();
                setPickerVisible(true);
              }
            }}
          >
            <Ionicons
              name={pickerVisible ? "chevron-down-outline" : "happy-outline"}
              size={22}
              color="#8696A0"
            />
          </TouchableOpacity>
          <TextInput
            ref={inputRef}
            className="flex-1 text-dark-text text-base max-h-24 py-2 px-1"
            placeholder="Message"
            placeholderTextColor="#8696A0"
            value={input}
            onChangeText={setInput}
            onFocus={() => setPickerVisible(false)}
            multiline
            editable={!sending}
          />
        </View>
        <TouchableOpacity
          onPress={sendMessage}
          disabled={!input.trim() || sending}
          className={`w-10 h-10 rounded-full items-center justify-center ${
            input.trim() && !sending ? "bg-accent" : "bg-dark-input"
          }`}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {pickerVisible ? (
        <View style={{ height: 320, backgroundColor: "#111B21" }}>
          <EmojiPicker
            emojis={emojiData}
            onEmojiSelect={(emoji) => setInput((prev) => prev + emoji)}
            onClose={() => setPickerVisible(false)}
          />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
