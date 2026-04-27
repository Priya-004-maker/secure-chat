import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { type Conversation } from "./api";

/**
 * Requests permissions for notifications, which is required for badges on iOS.
 */
export async function requestNotificationPermissions() {
  if (Platform.OS === "web") return false;
  
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  return finalStatus === "granted";
}

/**
 * Sets the app icon badge count.
 * @param count The number to display on the badge.
 */
export async function setBadgeCount(count: number) {
  if (Platform.OS === "web") return;
  
  try {
    // On some platforms/versions, we might need to check permissions first
    // but typically setBadgeCountAsync handles it or fails silently if not permitted.
    await Notifications.setBadgeCountAsync(count);
  } catch (err) {
    console.warn("Failed to set badge count:", err);
  }
}

/**
 * Calculates the total unread count from a list of conversations and updates the badge.
 * @param conversations List of conversations with unreadCount.
 */
export async function updateBadgeCountFromConversations(conversations: Conversation[]) {
  const totalUnread = conversations.reduce((sum, convo) => sum + (convo.unreadCount || 0), 0);
  await setBadgeCount(totalUnread);
  return totalUnread;
}
