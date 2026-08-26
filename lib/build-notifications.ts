import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import {
  BUILD_READY_NOTIFICATION_CATEGORY,
  getBuildOutcomeNotification,
  INSTALL_APK_NOTIFICATION_ACTION,
  isInstallApkNotificationAction,
  type BuildNotificationStatus,
} from "@/shared/build-notifications";

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
    description: "Résultat de vos compilations Android",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 180, 100, 180],
    lightColor: "#D4AF37",
  });
}

async function prepareBuildActionCategory() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationCategoryAsync(
    BUILD_READY_NOTIFICATION_CATEGORY,
    [{
      identifier: INSTALL_APK_NOTIFICATION_ACTION,
      buttonTitle: "Installer l’APK",
      options: {
        isAuthenticationRequired: false,
        isDestructive: false,
        opensAppToForeground: true,
      },
    }],
  );
}

/** Creates the native channel without displaying a permission prompt. */
export async function initializeBuildNotifications() {
  if (Platform.OS === "web") return false;
  try {
    await Promise.all([prepareAndroidChannel(), prepareBuildActionCategory()]);
    return true;
  } catch {
    return false;
  }
}

/** Called after the user has deliberately started a compilation. */
export async function enableBuildNotifications() {
  if (Platform.OS === "web") return false;
  try {
    await Promise.all([prepareAndroidChannel(), prepareBuildActionCategory()]);
    const current = await Notifications.getPermissionsAsync();
    const permission = current.status === "granted"
      ? current
      : await Notifications.requestPermissionsAsync();
    return permission.status === "granted";
  } catch {
    return false;
  }
}

export type BuildNotificationOpen = {
  intent: "open-build" | "install-apk";
  buildId?: string;
};

export function subscribeToBuildNotificationOpen(onOpen: (event: BuildNotificationOpen) => void) {
  if (Platform.OS === "web") return () => undefined;
  const handleResponse = (response: Notifications.NotificationResponse | null) => {
    if (!response) return;
    const route = response.notification.request.content.data?.route;
    const rawBuildId = response.notification.request.content.data?.buildId;
    if (route !== "/(tabs)") return;
    onOpen({
      intent: isInstallApkNotificationAction(response.actionIdentifier) ? "install-apk" : "open-build",
      buildId: typeof rawBuildId === "string" ? rawBuildId : undefined,
    });
    void Notifications.clearLastNotificationResponseAsync();
  };
  const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
  void Notifications.getLastNotificationResponseAsync().then(handleResponse).catch(() => undefined);
  return () => subscription.remove();
}

export async function notifyBuildOutcome(input: {
  id: string;
  status: BuildNotificationStatus;
  projectName: string;
  message?: string;
  artifactType?: "apk" | "aab";
}) {
  if (Platform.OS === "web") return false;
  const copy = getBuildOutcomeNotification(input);
  if (!copy) return false;

  const storageKey = `${NOTIFICATION_KEY_PREFIX}${input.id}:${input.status}`;
  try {
    await Promise.all([prepareAndroidChannel(), prepareBuildActionCategory()]);
    const permission = await Notifications.getPermissionsAsync();
    if (permission.status !== "granted") return false;
    if (await AsyncStorage.getItem(storageKey)) return false;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: copy.title,
        body: copy.body,
        data: { route: "/(tabs)", buildId: input.id },
        sound: "default",
        categoryIdentifier: input.status === "complete" && input.artifactType !== "aab" ? BUILD_READY_NOTIFICATION_CATEGORY : undefined,
      },
      trigger: null,
    });
    await AsyncStorage.setItem(storageKey, "1");
    return true;
  } catch {
    return false;
  }
}
