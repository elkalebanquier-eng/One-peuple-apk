/**
 * KIA ne reçoit jamais de clé Gemini dans l’APK. Son activation dépendra d’un
 * service sécurisé distinct ; jusque-là MIA reste le seul assistant disponible.
 */
export function getKiaUnavailableMessage() {
  return "KIA est préparée mais non activée. Utilisez MIA pour le moment.";
}

export function getKiaServiceDetail() {
  return "Préparée, mais non activée tant qu’un service sécurisé dédié n’est pas configuré.";
}
