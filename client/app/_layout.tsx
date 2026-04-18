import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { AuthProvider } from "./context/AuthContext";
import "../global.css";

export default function RootLayout() {
  return (
    <KeyboardProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#0B141A" },
          }}
        />
      </AuthProvider>
    </KeyboardProvider>
  );
}
