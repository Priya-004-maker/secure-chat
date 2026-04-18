import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { users, ApiError } from "../lib/api";

function initials(name?: string, email?: string) {
  const source = (name ?? email ?? "").trim();
  if (!source) return "";
  const parts = source.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
  }, [user?.name, user?.email]);

  const dirty =
    (name ?? "").trim() !== (user?.name ?? "") ||
    email.trim().toLowerCase() !== (user?.email ?? "").toLowerCase();

  const saveProfile = async () => {
    if (!dirty || savingProfile) return;
    setProfileError("");
    setProfileSuccess("");

    const payload: { name?: string; email?: string } = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedName !== (user?.name ?? "")) payload.name = trimmedName;
    if (trimmedEmail !== (user?.email ?? "").toLowerCase())
      payload.email = trimmedEmail;

    setSavingProfile(true);
    try {
      const updated = await users.updateProfile(payload);
      await updateUser(updated);
      setProfileSuccess("Profile updated");
    } catch (err) {
      setProfileError(
        err instanceof ApiError ? err.message : "Failed to update profile",
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (changingPassword) return;
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword) {
      setPasswordError("Both password fields are required");
      return;
    }
    if (newPassword.length < 6 || newPassword.length > 10) {
      setPasswordError("New password must be 6–10 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError("New password must differ from current");
      return;
    }

    setChangingPassword(true);
    try {
      await users.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Password updated");
    } catch (err) {
      setPasswordError(
        err instanceof ApiError ? err.message : "Failed to change password",
      );
    } finally {
      setChangingPassword(false);
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
        <Text className="text-dark-text text-xl font-semibold ml-2">
          Edit Profile
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center mb-6">
          <View
            style={{ width: 96, height: 96, borderRadius: 48 }}
            className="bg-accent items-center justify-center"
          >
            <Text className="text-white text-3xl font-bold">
              {initials(name, email) || "?"}
            </Text>
          </View>
        </View>

        <Text className="text-dark-muted text-xs uppercase mb-2">Name</Text>
        <TextInput
          className="bg-dark-input text-dark-text px-3 py-3 rounded-lg mb-4"
          placeholder="Your name"
          placeholderTextColor="#8696A0"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          editable={!savingProfile}
        />

        <Text className="text-dark-muted text-xs uppercase mb-2">Email</Text>
        <TextInput
          className="bg-dark-input text-dark-text px-3 py-3 rounded-lg mb-2"
          placeholder="you@example.com"
          placeholderTextColor="#8696A0"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!savingProfile}
        />

        {profileError ? (
          <Text className="text-red-400 text-xs mb-2">{profileError}</Text>
        ) : null}
        {profileSuccess ? (
          <Text className="text-green-400 text-xs mb-2">{profileSuccess}</Text>
        ) : null}

        <TouchableOpacity
          onPress={saveProfile}
          disabled={!dirty || savingProfile}
          className={`rounded-lg py-3 items-center mt-2 ${
            !dirty || savingProfile ? "bg-dark-input" : "bg-accent"
          }`}
        >
          {savingProfile ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white font-semibold">Save changes</Text>
          )}
        </TouchableOpacity>

        <View className="h-px bg-dark-border my-8" />

        <Text className="text-dark-text text-lg font-semibold mb-4">
          Change password
        </Text>

        <Text className="text-dark-muted text-xs uppercase mb-2">
          Current password
        </Text>
        <TextInput
          className="bg-dark-input text-dark-text px-3 py-3 rounded-lg mb-4"
          placeholder="Current password"
          placeholderTextColor="#8696A0"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          editable={!changingPassword}
        />

        <Text className="text-dark-muted text-xs uppercase mb-2">
          New password
        </Text>
        <TextInput
          className="bg-dark-input text-dark-text px-3 py-3 rounded-lg mb-4"
          placeholder="6–10 characters"
          placeholderTextColor="#8696A0"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          editable={!changingPassword}
        />

        <Text className="text-dark-muted text-xs uppercase mb-2">
          Confirm new password
        </Text>
        <TextInput
          className="bg-dark-input text-dark-text px-3 py-3 rounded-lg mb-2"
          placeholder="Repeat new password"
          placeholderTextColor="#8696A0"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          editable={!changingPassword}
        />

        {passwordError ? (
          <Text className="text-red-400 text-xs mb-2">{passwordError}</Text>
        ) : null}
        {passwordSuccess ? (
          <Text className="text-green-400 text-xs mb-2">{passwordSuccess}</Text>
        ) : null}

        <TouchableOpacity
          onPress={savePassword}
          disabled={changingPassword}
          className={`rounded-lg py-3 items-center mt-2 ${
            changingPassword ? "bg-dark-input" : "bg-accent"
          }`}
        >
          {changingPassword ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white font-semibold">Update password</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
