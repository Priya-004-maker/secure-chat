import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { chats, type Chat } from "../data/mock";

function formatTime(ts: number): string {
  const now = new Date();
  const date = new Date(ts);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function Avatar({ text, size = 50 }: { text: string; size?: number }) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="bg-accent items-center justify-center"
    >
      <Text
        style={{ fontSize: size * 0.36 }}
        className="text-white font-semibold"
      >
        {text}
      </Text>
    </View>
  );
}

function ChatItem({ chat }: { chat: Chat }) {
  return (
    <TouchableOpacity
      onPress={() => router.push(`/(app)/chat/${chat.id}`)}
      className="flex-row items-center px-4 py-3"
      activeOpacity={0.7}
    >
      <Avatar text={chat.avatar} />
      <View className="flex-1 ml-3 border-b border-dark-border pb-3">
        <View className="flex-row justify-between items-center">
          <Text
            className="text-dark-text text-base font-semibold flex-1"
            numberOfLines={1}
          >
            {chat.name}
          </Text>
          <Text
            className={`text-xs ml-2 ${
              chat.unreadCount > 0 ? "text-accent-light" : "text-dark-muted"
            }`}
          >
            {formatTime(chat.lastMessageTime)}
          </Text>
        </View>
        <View className="flex-row justify-between items-center mt-1">
          <Text className="text-dark-muted text-sm flex-1" numberOfLines={1}>
            {chat.lastMessage}
          </Text>
          {chat.unreadCount > 0 && (
            <View className="bg-accent rounded-full min-w-[20px] h-5 items-center justify-center px-1.5 ml-2">
              <Text className="text-white text-xs font-bold">
                {chat.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ChatList() {
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");

  const filtered = chats.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View className="flex-1 bg-dark-bg">
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8 }} className="bg-dark-surface pb-3 px-4">
        <View className="flex-row justify-between items-center">
          <Text className="text-dark-text text-2xl font-bold">SecureChat</Text>
          <View className="flex-row gap-5">
            <TouchableOpacity>
              <Ionicons name="camera-outline" size={24} color="#8696A0" />
            </TouchableOpacity>
            <TouchableOpacity onPress={signOut}>
              <Ionicons name="log-out-outline" size={24} color="#8696A0" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-dark-input rounded-lg mt-3 px-3 py-2">
          <Ionicons name="search" size={18} color="#8696A0" />
          <TextInput
            className="flex-1 text-dark-text ml-2 text-sm"
            placeholder="Search"
            placeholderTextColor="#8696A0"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Chat List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatItem chat={item} />}
        ListEmptyComponent={
          <View className="items-center justify-center pt-20">
            <Ionicons name="chatbubbles-outline" size={48} color="#8696A0" />
            <Text className="text-dark-muted text-base mt-4">
              No chats found
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
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
