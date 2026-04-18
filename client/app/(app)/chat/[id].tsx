import { memo, useCallback, useEffect, useRef, useState } from "react";
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
  Modal,
  Pressable,
  Dimensions,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  useAudioRecorder,
  useAudioRecorderState,
  useAudioPlayer,
  useAudioPlayerStatus,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from "expo-audio";
import { useAuth } from "../../context/AuthContext";
import {
  messages as messagesApi,
  uploadMediaAsset,
  users,
  ApiError,
  type MediaType,
  type Message,
  type MessageMedia,
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

function formatClockMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function AudioPlayerBubble({
  url,
  durationMs,
  isOwn,
}: {
  url: string;
  durationMs?: number;
  isOwn: boolean;
}) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);
  const totalMs =
    status.duration && status.duration > 0
      ? status.duration * 1000
      : durationMs ?? 0;
  const currentMs = (status.currentTime ?? 0) * 1000;
  const progress = totalMs > 0 ? Math.min(1, currentMs / totalMs) : 0;

  const toggle = () => {
    if (status.playing) {
      player.pause();
    } else {
      if (
        status.duration > 0 &&
        status.currentTime >= status.duration - 0.05
      ) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        minWidth: 200,
        maxWidth: 280,
      }}
    >
      <TouchableOpacity
        onPress={toggle}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: isOwn ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name={status.playing ? "pause" : "play"}
          size={18}
          color="#fff"
        />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <View
          style={{
            height: 3,
            borderRadius: 2,
            backgroundColor: isOwn ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.15)",
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${progress * 100}%`,
              height: "100%",
              backgroundColor: isOwn ? "#93C5FD" : "#60A5FA",
            }}
          />
        </View>
        <Text className="text-dark-muted text-[10px] mt-1">
          {formatClockMs(status.playing || currentMs > 0 ? currentMs : totalMs)}
        </Text>
      </View>
    </View>
  );
}

function mediaDisplaySize(media: { width?: number; height?: number }) {
  const maxW = 240;
  const maxH = 320;
  if (!media.width || !media.height) {
    return { width: maxW, height: Math.round(maxW * 1.2) };
  }
  const ratio = media.width / media.height;
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }
  return { width: Math.round(w), height: Math.round(h) };
}

const MessageBubble = memo(function MessageBubble({
  message,
  isOwn,
  onDeleteMessage,
  onMediaPress,
}: {
  message: Message;
  isOwn: boolean;
  onDeleteMessage?: (messageId: string) => void;
  onMediaPress?: (media: MessageMedia) => void;
}) {
  const seen = isOwn && !!message.seenAt;
  const media = message.media;
  const hasImage = media?.type === "image" && !!media.url;
  const hasVideo = media?.type === "video" && !!media.url;
  const hasAudio = media?.type === "audio" && !!media.url;
  const hasVisualMedia = hasImage || hasVideo;
  const hasText = !!message.content;
  const mediaSize = hasVisualMedia
    ? mediaDisplaySize({ width: media?.width, height: media?.height })
    : null;

  return (
    <View className={`px-3 mb-1 ${isOwn ? "items-end" : "items-start"}`}>
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={isOwn ? () => onDeleteMessage?.(message._id) : undefined}
        delayLongPress={300}
        disabled={!isOwn || !onDeleteMessage}
        className={`max-w-[80%] rounded-xl ${
          hasVisualMedia ? "p-1" : "px-3 py-2"
        } ${isOwn ? "bg-bubble-own rounded-tr-sm" : "bg-bubble-other rounded-tl-sm"}`}
      >
        {hasImage && mediaSize && media ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onMediaPress?.(media)}
            onLongPress={isOwn ? () => onDeleteMessage?.(message._id) : undefined}
            delayLongPress={300}
          >
            <Image
              source={{ uri: media.url }}
              style={{ width: mediaSize.width, height: mediaSize.height, borderRadius: 10 }}
              contentFit="cover"
              transition={150}
            />
          </TouchableOpacity>
        ) : null}
        {hasVideo && mediaSize && media ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onMediaPress?.(media)}
            onLongPress={isOwn ? () => onDeleteMessage?.(message._id) : undefined}
            delayLongPress={300}
            style={{
              width: mediaSize.width,
              height: mediaSize.height,
              borderRadius: 10,
              backgroundColor: "#000",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {media.thumbnailUrl ? (
              <Image
                source={{ uri: media.thumbnailUrl }}
                style={{ position: "absolute", inset: 0 }}
                contentFit="cover"
                transition={150}
              />
            ) : null}
            <View
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "rgba(0,0,0,0.25)",
              }}
            />
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: "rgba(0,0,0,0.55)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="play" size={28} color="#fff" />
            </View>
            <View
              style={{
                position: "absolute",
                bottom: 6,
                left: 8,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Ionicons name="videocam" size={12} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 11 }}>Video</Text>
            </View>
          </TouchableOpacity>
        ) : null}
        {hasAudio && media ? (
          <AudioPlayerBubble
            url={media.url}
            durationMs={media.durationMs}
            isOwn={isOwn}
          />
        ) : null}
        {hasText ? (
          <Text
            className={`text-dark-text text-[15px] leading-5 ${hasVisualMedia ? "px-2 pt-1" : ""}`}
          >
            {message.content}
          </Text>
        ) : null}
        <View
          className={`flex-row items-center self-end mt-0.5 gap-1 ${
            hasVisualMedia ? "px-2 pb-1" : ""
          }`}
        >
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
});

MessageBubble.displayName = "MessageBubble";

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
  const [viewerMedia, setViewerMedia] = useState<MessageMedia | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);

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

  const confirmDelete = useCallback((messageId: string) => {
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
  }, [items]);

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

  const closePicker = useCallback(() => {
    setPickerVisible(false);
  }, []);

  const togglePicker = useCallback(() => {
    if (pickerVisible) {
      setPickerVisible(false);
      inputRef.current?.focus();
      return;
    }
    Keyboard.dismiss();
    setPickerVisible(true);
  }, [pickerVisible]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    setInput((prev) => prev + emoji);
  }, []);

  const renderMessageItem = useCallback(
    ({ item }: { item: Message }) => {
      const isOwn = item.sender === user?.id;
      return (
        <MessageBubble
          message={item}
          isOwn={isOwn}
          onDeleteMessage={confirmDelete}
          onMediaPress={setViewerMedia}
        />
      );
    },
    [user?.id, confirmDelete],
  );

  const pickAndSendMedia = async () => {
    if (!id || sending) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError("Media library permission is required");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        quality: 0.8,
        exif: false,
        videoMaxDuration: 60,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const type: MediaType = asset.type === "video" ? "video" : "image";

      setSending(true);
      setError("");

      let thumbnail: { uri: string; width: number; height: number } | null = null;
      if (type === "video") {
        try {
          thumbnail = await VideoThumbnails.getThumbnailAsync(asset.uri, {
            time: 500,
            quality: 0.7,
          });
        } catch (err) {
          console.warn("Failed to generate video thumbnail", err);
        }
      }

      const [media, thumbMedia] = await Promise.all([
        uploadMediaAsset(type, {
          uri: asset.uri,
          mimeType: asset.mimeType,
          fileName: asset.fileName,
          fileSize: asset.fileSize,
          width: asset.width,
          height: asset.height,
          duration: asset.duration,
        }),
        thumbnail
          ? uploadMediaAsset("image", {
              uri: thumbnail.uri,
              mimeType: "image/jpeg",
              width: thumbnail.width,
              height: thumbnail.height,
            })
          : Promise.resolve(null),
      ]);

      if (thumbMedia) {
        media.thumbnailKey = thumbMedia.key;
        if (!media.width) media.width = thumbMedia.width;
        if (!media.height) media.height = thumbMedia.height;
      }

      const pendingText = input.trim();
      const created = await messagesApi.send({
        recipientId: id,
        content: pendingText || undefined,
        media,
      });
      setItems((prev) => [created, ...prev]);
      if (pendingText) setInput("");
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else if (err instanceof Error) setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    if (sending || recorderState.isRecording) return;
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setError("Microphone permission is required");
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setError("");
      Keyboard.dismiss();
      setPickerVisible(false);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    }
  };

  const cancelRecording = async () => {
    if (!recorderState.isRecording) return;
    try {
      await recorder.stop();
    } catch {
      // ignore
    }
    await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
  };

  const stopAndSendRecording = async () => {
    if (!id || !recorderState.isRecording) return;
    const durationMs = recorderState.durationMillis;
    try {
      await recorder.stop();
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      return;
    }
    await setAudioModeAsync({ allowsRecording: false }).catch(() => {});

    const uri = recorder.uri;
    if (!uri) {
      setError("Recording produced no file");
      return;
    }
    if (durationMs < 500) {
      setError("Recording too short");
      return;
    }

    setSending(true);
    try {
      const ext = (uri.split(".").pop() || "m4a").toLowerCase();
      const mimeType =
        ext === "m4a" || ext === "mp4"
          ? "audio/mp4"
          : ext === "aac"
            ? "audio/aac"
            : ext === "wav"
              ? "audio/wav"
              : ext === "webm"
                ? "audio/webm"
                : ext === "3gp"
                  ? "audio/3gpp"
                  : "audio/mpeg";

      const media = await uploadMediaAsset("audio", {
        uri,
        mimeType,
        fileName: `voice.${ext}`,
        duration: durationMs,
      });
      const created = await messagesApi.send({
        recipientId: id,
        media,
      });
      setItems((prev) => [created, ...prev]);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else if (err instanceof Error) setError(err.message);
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
      keyboardVerticalOffset={insets.top}
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
          removeClippedSubviews
          initialNumToRender={12}
          maxToRenderPerBatch={8}
          windowSize={7}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={renderMessageItem}
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
        style={{
          paddingBottom: Math.max(insets.bottom, 8),
        }}
        className="bg-dark-surface px-2 py-2 flex-row items-end"
      >
        {recorderState.isRecording ? (
          <View className="flex-1 flex-row items-center bg-dark-input rounded-2xl px-3 py-2 mx-1">
            <TouchableOpacity onPress={cancelRecording} className="p-1.5">
              <Ionicons name="trash-outline" size={22} color="#EF4444" />
            </TouchableOpacity>
            <View className="flex-row items-center flex-1 ml-2">
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "#EF4444",
                  marginRight: 8,
                }}
              />
              <Text className="text-dark-text text-sm">
                Recording {formatClockMs(recorderState.durationMillis)}
              </Text>
            </View>
          </View>
        ) : (
          <View className="flex-1 flex-row items-center bg-dark-input rounded-2xl px-2 py-1 mx-1">
            <TouchableOpacity
              className="p-1.5"
              onPress={togglePicker}
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
              onFocus={closePicker}
              multiline
              editable={!sending}
            />
            <TouchableOpacity
              className="p-1.5"
              onPress={pickAndSendMedia}
              disabled={sending}
            >
              <Ionicons name="attach" size={22} color="#8696A0" />
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity
          onPress={
            recorderState.isRecording
              ? stopAndSendRecording
              : input.trim()
                ? sendMessage
                : startRecording
          }
          disabled={sending}
          className={`w-10 h-10 rounded-full items-center justify-center ${
            input.trim() || recorderState.isRecording ? "bg-accent" : "bg-dark-input"
          }`}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : recorderState.isRecording ? (
            <Ionicons name="send" size={18} color="#fff" />
          ) : input.trim() ? (
            <Ionicons name="send" size={18} color="#fff" />
          ) : (
            <Ionicons name="mic" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {pickerVisible ? (
        <View style={{ height: 320, backgroundColor: "#111B21" }}>
          <EmojiPicker
            emojis={emojiData}
            onEmojiSelect={handleEmojiSelect}
            onClose={closePicker}
          />
        </View>
      ) : null}

      <MediaViewerModal
        media={viewerMedia}
        onClose={() => setViewerMedia(null)}
      />
    </KeyboardAvoidingView>
  );
}

function MediaViewerModal({
  media,
  onClose,
}: {
  media: MessageMedia | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={!!media}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      {media ? <MediaViewerContent media={media} onClose={onClose} /> : null}
    </Modal>
  );
}

function MediaViewerContent({
  media,
  onClose,
}: {
  media: MessageMedia;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get("window");
  const innerHeight = height - insets.top - insets.bottom;
  const isVideo = media.type === "video";

  const player = useVideoPlayer(isVideo ? media.url : null, (p) => {
    if (!isVideo) return;
    p.loop = false;
    p.play();
  });

  return (
    <Pressable
      onPress={isVideo ? undefined : onClose}
      style={{
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.95)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {isVideo ? (
        <VideoView
          player={player}
          style={{ width, height: innerHeight }}
          contentFit="contain"
          fullscreenOptions={{ enable: true }}
          allowsPictureInPicture
          nativeControls
        />
      ) : (
        <Image
          source={{ uri: media.url }}
          style={{ width, height: innerHeight }}
          contentFit="contain"
          transition={150}
        />
      )}
      <TouchableOpacity
        onPress={onClose}
        style={{
          position: "absolute",
          top: insets.top + 12,
          right: 16,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: "rgba(0,0,0,0.5)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="close" size={24} color="#fff" />
      </TouchableOpacity>
    </Pressable>
  );
}
