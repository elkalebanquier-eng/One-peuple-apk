export type BuildResponsePayload = {
  status?: string;
  message?: string;
  apkUrl?: string;
  remaining?: number;
  max?: number;
  remainingBuilds?: number;
  maxBuildsPerHour?: number;
};

/** Converts server output into a safe response, never exposing JSON parsing details. */
export function readBuildResponse(body: string, statusCode: number): BuildResponsePayload {
  if (!body) return {};
  try {
    return JSON.parse(body) as BuildResponsePayload;
  } catch {
    if (body.trim().startsWith("<")) {
      throw new Error("Le moteur de compilation est momentanément indisponible. Réessayez dans quelques minutes.");
    }
    throw new Error(statusCode >= 500
      ? "Le moteur de compilation est momentanément indisponible. Réessayez dans quelques minutes."
      : "MIA💻 n’a pas reçu une réponse utilisable. Réessayez après avoir vérifié votre connexion.");
  }
}

/** Explique qu’un build conservé seulement temporairement par le moteur a disparu. */
export function getUnavailableBuildMessage(statusCode: number, message?: string) {
  if (statusCode !== 404 && statusCode !== 410) return null;
  if (message?.trim()) {
    return `${message.trim()} Votre fichier est toujours enregistré sur ce téléphone : appuyez sur Relancer.`;
  }
  return "Cette compilation n’est plus disponible. Votre fichier est toujours enregistré sur ce téléphone : appuyez sur Relancer.";
}
