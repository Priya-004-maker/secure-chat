import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { users, ApiError } from "../lib/api";

export default function NewChat() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Enter an email");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const found = await users.searchByEmail(trimmed);
      router.replace(`/(app)/chat/${found.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={0}
      className="flex-1 bg-dark-bg"
    >
      <View
        style={{ paddingTop: insets.top + 8 }}
        className="bg-dark-surface pb-3 px-2 flex-row items-center"
      >
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#E9EDEF" />
        </TouchableOpacity>
        <Text className="text-dark-text text-lg font-semibold ml-2">
          New chat
        </Text>
      </View>

      <View className="flex-1 px-8 pt-10">
        <Text className="text-dark-muted text-sm mb-2 ml-1">
          Recipient email
        </Text>
        <View className="flex-row items-center bg-dark-input rounded-xl px-4 border border-dark-border">
          <Ionicons name="mail-outline" size={20} color="#8696A0" />
          <TextInput
            className="flex-1 text-dark-text py-4 px-3 text-base"
            placeholder="friend@example.com"
            placeholderTextColor="#8696A0"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            onSubmitEditing={handleStart}
          />
        </View>

        {error ? (
          <Text className="text-red-400 text-sm text-center mt-3">{error}</Text>
        ) : null}

        <TouchableOpacity
          onPress={handleStart}
          disabled={loading}
          className="bg-accent rounded-xl py-4 mt-6"
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-center text-base font-semibold">
              Start chat
            </Text>
          )}
        </TouchableOpacity>

        <Text className="text-dark-muted text-xs text-center mt-6">
          The user must already have a Delta account.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
