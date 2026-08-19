export type BuildNotificationStatus = "draft" | "ready" | "queued" | "building" | "complete" | "failed";

export type BuildNotificationCopy = {
  title: string;
  body: string;
};

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
      body: `${projectName} a terminé sa compilation. Touchez pour la télécharger et l’installer.`,
    };
  }

  if (input.status === "failed") {
    return {
      title: "Compilation à vérifier",
      body: input.message?.trim() || `${projectName} n’a pas pu être compilée. Touchez pour voir la solution proposée.`,
    };
  }

  return null;
}

/** A final outcome must be announced only when the status actually changes. */
export function shouldNotifyBuildStatus(
  previousStatus: BuildNotificationStatus | undefined,
  nextStatus: BuildNotificationStatus,
) {
  return previousStatus !== nextStatus && (nextStatus === "complete" || nextStatus === "failed");
}
