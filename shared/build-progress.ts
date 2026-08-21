export const BUILD_PROGRESS_EVENT_LIMIT = 8;

export interface BuildProgressEvent {
  progress: number;
  message: string;
  createdAt: string;
}

/**
 * Estimation volontairement large : le temps réel dépend de la file et du projet envoyé.
 * Les seuils correspondent aux jalons que le worker transmet réellement à l’application.
 */
export function getBuildTimeRemainingLabel(status: string, rawProgress: unknown) {
  if (status === "complete") return "APK prête";
  if (status === "failed") return "Compilation arrêtée";

  const progress = normalizeBuildProgress(rawProgress, status === "queued" ? 5 : 12);
  if (progress < 22) return "Environ 8 à 12 min restantes";
  if (progress < 35) return "Environ 7 à 10 min restantes";
  if (progress < 55) return "Environ 5 à 8 min restantes";
  if (progress < 82) return "Environ 3 à 6 min restantes";
  if (progress < 92) return "Environ 2 à 4 min restantes";
  if (progress < 97) return "Environ 1 à 3 min restantes";
  return "Moins d’une minute";
}

export function normalizeBuildProgress(value: unknown, fallback = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Accepte uniquement le journal simple et borné renvoyé par le relais de compilation. */
export function readBuildProgressEvents(value: unknown): BuildProgressEvent[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((event): event is Record<string, unknown> => Boolean(event) && typeof event === "object")
    .filter((event) => typeof event.progress === "number" && Number.isFinite(event.progress))
    .map((event) => ({
      progress: normalizeBuildProgress(event.progress),
      message: typeof event.message === "string" ? event.message.slice(0, 180).trim() : "",
      createdAt: typeof event.createdAt === "string" ? event.createdAt : "",
    }))
    .filter((event) => Boolean(event.message) && Boolean(event.createdAt))
    .slice(-BUILD_PROGRESS_EVENT_LIMIT);
}
