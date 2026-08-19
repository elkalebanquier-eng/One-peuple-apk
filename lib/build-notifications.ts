import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { getBuildOutcomeNotification, type BuildNotificationStatus } from "@/shared/build-notifications";

const BUILD_CHANNEL_ID = "mia-builds";
const NOTIFICATION_KEY_PREFIX = "mia-build-notified:";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function prepareAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(BUILD_CHANNEL_ID, {
    name: "Compilations MIA",
    description: "Résultat de vos compilations APK",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 180, 100, 180],
    lightColor: "#D4AF37",
  });
}

/** Creates the native channel without displaying a permission prompt. */
export async function initializeBuildNotifications() {
  if (Platform.OS === "web") return false;
  try {
    await prepareAndroidChannel();
    return true;
  } catch {
    return false;
  }
}

/** Called after the user has deliberately started a compilation. */
export async function enableBuildNotifications() {
  if (Platform.OS === "web") return false;
  try {
    await prepareAndroidChannel();
    const current = await Notifications.getPermissionsAsync();
    const permission = current.status === "granted"
      ? current
      : await Notifications.requestPermissionsAsync();
    return permission.status === "granted";
  } catch {
    return false;
  }
}

export function subscribeToBuildNotificationOpen(onOpen: () => void) {
  if (Platform.OS === "web") return () => undefined;
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const route = response.notification.request.content.data?.route;
    if (route === "/(tabs)") onOpen();
  });
  return () => subscription.remove();
}

export async function notifyBuildOutcome(input: {
  id: string;
  status: BuildNotificationStatus;
  projectName: string;
  message?: string;
}) {
  if (Platform.OS === "web") return false;
  const copy = getBuildOutcomeNotification(input);
  if (!copy) return false;

  const storageKey = `${NOTIFICATION_KEY_PREFIX}${input.id}:${input.status}`;
  try {
    await prepareAndroidChannel();
    const permission = await Notifications.getPermissionsAsync();
    if (permission.status !== "granted") return false;
    if (await AsyncStorage.getItem(storageKey)) return false;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: copy.title,
        body: copy.body,
        data: { route: "/(tabs)", buildId: input.id },
        sound: "default",
      },
      trigger: null,
    });
    await AsyncStorage.setItem(storageKey, "1");
    return true;
  } catch {
    return false;
  }
}
