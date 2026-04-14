import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router, Link } from "expo-router";
import { useAuth } from "./context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { ApiError } from "./lib/api";

export default function SignUp() {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      return;
    }
    if (password.length < 6 || password.length > 10) {
      setError("Password must be between 6 and 10 characters");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await signUp(name.trim(), email.trim(), password);
      router.replace("/(app)");
    } catch (err) {
      console.error("Sign-up error:", err);
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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-dark-bg"
    >
      <View className="flex-1 justify-center px-8">
        <View className="items-center mb-10">
          <View className="w-20 h-20 rounded-full bg-accent items-center justify-center mb-4">
            <Ionicons name="person-add" size={36} color="#fff" />
          </View>
          <Text className="text-dark-text text-3xl font-bold">
            Create account
          </Text>
          <Text className="text-dark-muted text-base mt-2">
            Join SecureChat in seconds
          </Text>
        </View>

        <View className="gap-4">
          <View>
            <Text className="text-dark-muted text-sm mb-2 ml-1">Name</Text>
            <View className="flex-row items-center bg-dark-input rounded-xl px-4 border border-dark-border">
              <Ionicons name="person-outline" size={20} color="#8696A0" />
              <TextInput
                className="flex-1 text-dark-text py-4 px-3 text-base"
                placeholder="Your name (optional)"
                placeholderTextColor="#8696A0"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View>
            <Text className="text-dark-muted text-sm mb-2 ml-1">Email</Text>
            <View className="flex-row items-center bg-dark-input rounded-xl px-4 border border-dark-border">
              <Ionicons name="mail-outline" size={20} color="#8696A0" />
              <TextInput
                className="flex-1 text-dark-text py-4 px-3 text-base"
                placeholder="Enter your email"
                placeholderTextColor="#8696A0"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View>
            <Text className="text-dark-muted text-sm mb-2 ml-1">Password</Text>
            <View className="flex-row items-center bg-dark-input rounded-xl px-4 border border-dark-border">
              <Ionicons name="lock-closed-outline" size={20} color="#8696A0" />
              <TextInput
                className="flex-1 text-dark-text py-4 px-3 text-base"
                placeholder="6 to 10 characters"
                placeholderTextColor="#8696A0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#8696A0"
                />
              </TouchableOpacity>
            </View>
          </View>

          {error ? (
            <Text className="text-red-400 text-sm text-center">{error}</Text>
          ) : null}

          <TouchableOpacity
            onPress={handleSignUp}
            disabled={loading}
            className="bg-accent rounded-xl py-4 mt-4"
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-center text-base font-semibold">
                Create account
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="mt-8 flex-row justify-center">
          <Text className="text-dark-muted text-sm">
            Already have an account?{" "}
          </Text>
          <Link href="/login" asChild>
            <TouchableOpacity>
              <Text className="text-accent-light text-sm font-semibold">
                Login
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
