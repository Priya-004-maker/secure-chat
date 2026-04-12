import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import {
  chats,
  getMessages,
  getContact,
  type Message,
} from "../../data/mock";

function formatMessageTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Avatar({ text, size = 36 }: { text: string; size?: number }) {
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

function MessageBubble({
  message,
  isOwn,
  showSender,
  isGroup,
}: {
  message: Message;
  isOwn: boolean;
  showSender: boolean;
  isGroup: boolean;
}) {
  const contact = getContact(message.senderId);
  const senderColors = [
    "text-blue-400",
    "text-green-400",
    "text-purple-400",
    "text-yellow-400",
    "text-pink-400",
    "text-cyan-400",
  ];
  const colorIndex =
    parseInt(message.senderId.replace("u", ""), 10) % senderColors.length;

  return (
    <View className={`px-3 mb-1 ${isOwn ? "items-end" : "items-start"}`}>
      <View
        className={`max-w-[80%] rounded-xl px-3 py-2 ${
          isOwn ? "bg-bubble-own rounded-tr-sm" : "bg-bubble-other rounded-tl-sm"
        }`}
      >
        {isGroup && !isOwn && showSender && (
          <Text className={`text-xs font-semibold mb-0.5 ${senderColors[colorIndex]}`}>
            {contact?.name || "Unknown"}
          </Text>
        )}
        <Text className="text-dark-text text-[15px] leading-5">
          {message.text}
        </Text>
        <Text
          className={`text-[10px] mt-0.5 ${
            isOwn ? "text-blue-300" : "text-dark-muted"
          } self-end`}
        >
          {formatMessageTime(message.timestamp)}
          {isOwn && "  ✓✓"}
        </Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const chat = chats.find((c) => c.id === id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (id) {
      setMessages(getMessages(id));
    }
  }, [id]);

  const sendMessage = () => {
    if (!input.trim() || !user) return;
    const newMsg: Message = {
      id: `${id}-m${messages.length}`,
      chatId: id!,
      senderId: user.id,
      text: input.trim(),
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  if (!chat) {
    return (
      <View className="flex-1 bg-dark-bg items-center justify-center">
        <Text className="text-dark-muted">Chat not found</Text>
      </View>
    );
  }

  const memberCount = chat.members.length;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-dark-bg"
    >
      {/* Header */}
      <View
        style={{ paddingTop: insets.top + 8 }}
        className="bg-dark-surface pb-2 px-2 flex-row items-center"
      >
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#E9EDEF" />
        </TouchableOpacity>
        <Avatar text={chat.avatar} size={40} />
        <View className="ml-3 flex-1">
          <Text className="text-dark-text text-base font-semibold" numberOfLines={1}>
            {chat.name}
          </Text>
          <Text className="text-dark-muted text-xs" numberOfLines={1}>
            {chat.isGroup
              ? `${memberCount} members`
              : "online"}
          </Text>
        </View>
        <TouchableOpacity className="p-2">
          <Ionicons name="videocam-outline" size={22} color="#8696A0" />
        </TouchableOpacity>
        <TouchableOpacity className="p-2">
          <Ionicons name="call-outline" size={20} color="#8696A0" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 8 }}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
        renderItem={({ item, index }) => {
          const isOwn = item.senderId === user?.id;
          const prevMsg = index > 0 ? messages[index - 1] : null;
          const showSender = !prevMsg || prevMsg.senderId !== item.senderId;
          return (
            <MessageBubble
              message={item}
              isOwn={isOwn}
              showSender={showSender}
              isGroup={chat.isGroup}
            />
          );
        }}
      />

      {/* Input Bar */}
      <View
        style={{ paddingBottom: Math.max(insets.bottom, 8) }}
        className="bg-dark-surface px-2 py-2 flex-row items-end"
      >
        <TouchableOpacity className="p-2">
          <Ionicons name="happy-outline" size={24} color="#8696A0" />
        </TouchableOpacity>
        <View className="flex-1 flex-row items-end bg-dark-input rounded-2xl px-3 py-1 mx-1">
          <TextInput
            className="flex-1 text-dark-text text-base max-h-24 py-2"
            placeholder="Message"
            placeholderTextColor="#8696A0"
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity className="p-1.5">
            <Ionicons name="attach-outline" size={22} color="#8696A0" />
          </TouchableOpacity>
          <TouchableOpacity className="p-1.5">
            <Ionicons name="camera-outline" size={22} color="#8696A0" />
          </TouchableOpacity>
        </View>
        {input.trim() ? (
          <TouchableOpacity
            onPress={sendMessage}
            className="w-10 h-10 rounded-full bg-accent items-center justify-center"
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity className="w-10 h-10 rounded-full bg-accent items-center justify-center">
            <Ionicons name="mic" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
