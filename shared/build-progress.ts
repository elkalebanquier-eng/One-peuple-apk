export const BUILD_PROGRESS_EVENT_LIMIT = 8;

export interface BuildProgressEvent {
  progress: number;
  message: string;
  createdAt: string;
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
