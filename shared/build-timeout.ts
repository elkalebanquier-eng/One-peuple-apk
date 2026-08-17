export const QUEUE_TIMEOUT_MS = 12 * 60 * 1000;
export const BUILD_TIMEOUT_MS = 35 * 60 * 1000;

/** Renvoie un message simple si une tâche ne peut plus progresser de façon fiable. */
export function getBuildTimeoutMessage(
  status: string,
  createdAt: number,
  updatedAt: number,
  now = Date.now(),
) {
  if (status === "queued" && now - createdAt >= QUEUE_TIMEOUT_MS) {
    return "La compilation n’a pas démarré dans le délai prévu. Votre fichier reste enregistré sur ce téléphone : appuyez sur Relancer.";
  }

  if (status === "building" && now - updatedAt >= BUILD_TIMEOUT_MS) {
    return "La compilation a pris trop de temps. Votre fichier reste enregistré sur ce téléphone : appuyez sur Relancer.";
  }

  return null;
}
