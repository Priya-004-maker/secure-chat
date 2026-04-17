import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { messages as messagesApi, type Conversation } from "../lib/api";
import { isOnline } from "../lib/presence";

function initials(name?: string, email?: string) {
  const source = (name ?? email ?? "").trim();
  if (!source) return "";
  const parts = source.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function formatTime(iso: string): string {
  const now = new Date();
  const date = new Date(iso);
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function Avatar({
  text,
  size = 50,
  online = false,
}: {
  text: string;
  size?: number;
  online?: boolean;
}) {
  const dot = Math.max(10, Math.round(size * 0.26));
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

function lastMessagePreview(convo: Conversation): string {
  if (convo.lastMessage) return convo.lastMessage;
  if (convo.lastMediaType === "image") return "📷 Photo";
  if (convo.lastMediaType === "video") return "🎥 Video";
  if (convo.lastMediaType === "audio") return "🎵 Audio";
  return "";
}

function ConversationItem({ convo }: { convo: Conversation }) {
  const display = convo.name || convo.email;
  const hasUnread = convo.unreadCount > 0;
  const preview = lastMessagePreview(convo);
  return (
    <TouchableOpacity
      onPress={() => router.push(`/(app)/chat/${convo.userId}`)}
      className="flex-row items-center px-4 py-3"
      activeOpacity={0.7}
    >
      <Avatar
        text={initials(convo.name, convo.email)}
        online={isOnline(convo.lastSeenAt)}
      />
      <View className="flex-1 ml-3 border-b border-dark-border pb-3">
        <View className="flex-row justify-between items-center">
          <Text
            className="text-dark-text text-base font-semibold flex-1"
            numberOfLines={1}
          >
            {display}
          </Text>
          <Text
            className={`text-xs ml-2 ${
              hasUnread ? "text-accent-light font-semibold" : "text-dark-muted"
            }`}
          >
            {formatTime(convo.lastAt)}
          </Text>
        </View>
        <View className="flex-row items-center mt-1">
          <Text
            className={`flex-1 mr-2 text-sm ${
              hasUnread ? "text-dark-text font-semibold" : "text-dark-muted"
            }`}
            numberOfLines={1}
          >
            {preview}
          </Text>
          {hasUnread ? (
            <View className="min-w-[22px] h-[22px] px-[7px] rounded-full bg-accent items-center justify-center">
              <Text className="text-white text-xs font-bold">
                {convo.unreadCount > 99 ? "99+" : String(convo.unreadCount)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ChatList() {
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await messagesApi.conversations();
      setConvos(data);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const timer = setInterval(load, 3000);
      return () => clearInterval(timer);
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const filtered = convos.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.name ?? "").toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  return (
    <View className="flex-1 bg-dark-bg">
      <View
        style={{ paddingTop: insets.top + 8 }}
        className="bg-dark-surface pb-3 px-4"
      >
        <View className="flex-row justify-between items-center">
          <Text className="text-dark-text text-2xl font-bold">SecureChat</Text>
          <View className="flex-row gap-5">
            <TouchableOpacity onPress={signOut}>
              <Ionicons name="log-out-outline" size={24} color="#8696A0" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-row items-center bg-dark-input rounded-lg mt-3 px-3 py-2">
          <Ionicons name="search" size={18} color="#8696A0" />
          <TextInput
            className="flex-1 text-dark-text ml-2 text-sm"
            placeholder="Search by name or email"
            placeholderTextColor="#8696A0"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.userId}
          renderItem={({ item }) => <ConversationItem convo={item} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#2563EB"
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center pt-20 px-8">
              <Ionicons name="chatbubbles-outline" size={48} color="#8696A0" />
              <Text className="text-dark-muted text-base mt-4 text-center">
                {search
                  ? "No conversations match your search"
                  : "No conversations yet. Start one with the button below."}
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        onPress={() => router.push("/(app)/new-chat")}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-accent items-center justify-center"
        style={{
          shadowColor: "#2563EB",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
