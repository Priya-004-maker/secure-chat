import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { router, Link } from "expo-router";
import { useAuth } from "./context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { ApiError } from "./lib/api";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/(app)");
    } catch (err) {
      console.error("Login error:", err);
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
      <View className="flex-1 justify-center px-8">
        {/* Logo / Branding */}
        <View className="items-center mb-12">
          <Image
            source={require("../assets/images/logo.png")}
            className="w-20 h-20 mb-4"
            resizeMode="contain"
          />
          <Text className="text-dark-text text-3xl font-bold">Delta</Text>
          <Text className="text-dark-muted text-base mt-2">
            End-to-end encrypted messaging
          </Text>
        </View>

        {/* Form */}
        <View className="gap-4">
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
                placeholder="Enter your password"
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
            onPress={handleLogin}
            disabled={loading}
            className="bg-accent rounded-xl py-4 mt-4"
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-center text-base font-semibold">
                Login
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Sign-up link */}
        <View className="mt-8 flex-row justify-center">
          <Text className="text-dark-muted text-sm">
            Don&apos;t have an account?{" "}
          </Text>
          <Link href="/sign-up" asChild>
            <TouchableOpacity>
              <Text className="text-accent-light text-sm font-semibold">
                Create one
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
