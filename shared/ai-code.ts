export type AiCodeResponse = {
  code: string;
  explanation: string;
};

export function readAiCodeResponse(text: string): AiCodeResponse | null {
  try {
    const payload = JSON.parse(text) as Partial<AiCodeResponse>;
    if (typeof payload.code !== "string" || !payload.code.trim()) return null;
    return {
      code: payload.code.trim(),
      explanation: typeof payload.explanation === "string" && payload.explanation.trim()
        ? payload.explanation.trim()
        : "Le code est prêt. Relisez-le avant de l’utiliser.",
    };
  } catch {
    return null;
  }
}

export function getAiFailureMessage(text: string, status: number) {
  try {
    const payload = JSON.parse(text) as { message?: unknown };
    if (typeof payload.message === "string" && payload.message.trim()) return payload.message.trim();
  } catch {
    // Le relais peut répondre avec du texte si un incident survient.
  }

  if (status === 429) return "Vous avez beaucoup utilisé l’assistant. Attendez une heure puis réessayez.";
  return "L’assistant ne répond pas pour le moment. Vérifiez votre connexion puis réessayez.";
}
