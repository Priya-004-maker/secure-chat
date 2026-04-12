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
import { router } from "expo-router";
import { useAuth } from "./context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

export default function SignIn() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }
    setError("");
    setLoading(true);
    const success = await signIn(email, password);
    setLoading(false);
    if (success) {
      router.replace("/(app)");
    } else {
      setError("Invalid email or password");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-dark-bg"
    >
      <View className="flex-1 justify-center px-8">
        {/* Logo / Branding */}
        <View className="items-center mb-12">
          <View className="w-20 h-20 rounded-full bg-accent items-center justify-center mb-4">
            <Ionicons name="chatbubbles" size={40} color="#fff" />
          </View>
          <Text className="text-dark-text text-3xl font-bold">SecureChat</Text>
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
            onPress={handleSignIn}
            disabled={loading}
            className="bg-accent rounded-xl py-4 mt-4"
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-center text-base font-semibold">
                Sign In
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Hint */}
        <View className="mt-8 p-4 bg-dark-input rounded-xl border border-dark-border">
          <Text className="text-dark-muted text-xs text-center">
            Demo credentials: ok@ok.com / password
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
