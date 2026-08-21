export type BuildNotificationStatus = "draft" | "ready" | "queued" | "building" | "complete" | "failed";

/** Stable native identifiers for the Android action shown on completed APK notifications. */
export const BUILD_READY_NOTIFICATION_CATEGORY = "mia_build_ready";
export const INSTALL_APK_NOTIFICATION_ACTION = "mia_install_apk";

export type BuildNotificationCopy = {
  title: string;
  body: string;
};

/** Une compilation expirée se relance depuis le ZIP local : ce n’est pas un échec à notifier. */
export function isUnavailableBuildMessage(message?: string) {
  const normalized = message?.trim().toLocaleLowerCase("fr-FR") ?? "";
  return normalized.includes("compilation est introuvable")
    || normalized.includes("compilation n’est plus disponible")
    || normalized.includes("compilation n'est plus disponible");
}

/** Returns a user-facing notification only for a final build outcome. */
export function getBuildOutcomeNotification(input: {
  status: BuildNotificationStatus;
  projectName: string;
  message?: string;
}): BuildNotificationCopy | null {
  const projectName = input.projectName.trim() || "votre projet";

  if (input.status === "complete") {
    return {
      title: "Votre APK est prête",
      body: `${projectName} a terminé sa compilation. Utilisez « Installer l’APK » pour l’ouvrir directement.`,
    };
  }

  if (input.status === "failed") {
    if (isUnavailableBuildMessage(input.message)) return null;
    return {
      title: "Compilation à vérifier",
      body: input.message?.trim() || `${projectName} n’a pas pu être compilée. Touchez pour voir la solution proposée.`,
    };
  }

  return null;
}

export function isInstallApkNotificationAction(actionIdentifier: string) {
  return actionIdentifier === INSTALL_APK_NOTIFICATION_ACTION;
}

/** A final outcome must be announced only when the status actually changes. */
export function shouldNotifyBuildStatus(
  previousStatus: BuildNotificationStatus | undefined,
  nextStatus: BuildNotificationStatus,
) {
  return previousStatus !== nextStatus && (nextStatus === "complete" || nextStatus === "failed");
}
