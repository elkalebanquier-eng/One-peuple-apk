export type BuildResponsePayload = {
  status?: string;
  message?: string;
  apkUrl?: string;
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
      : "One App n’a pas reçu une réponse utilisable. Réessayez après avoir vérifié votre connexion.");
  }
}
