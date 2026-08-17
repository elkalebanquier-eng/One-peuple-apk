export type AiCodeResponse = {
  code: string;
  explanation: string;
};

export type AiCodeProjectType = "expo" | "android" | "html";

export type AiCodeHistoryEntry = AiCodeResponse & {
  id: string;
  projectType: AiCodeProjectType;
  prompt: string;
  createdAt: string;
};

export const AI_CODE_HISTORY_LIMIT = 12;

function isProjectType(value: unknown): value is AiCodeProjectType {
  return value === "expo" || value === "android" || value === "html";
}

/** Lit uniquement des entrées sûres et bornées avant de les afficher sur le téléphone. */
export function readAiCodeHistory(value: unknown): AiCodeHistoryEntry[] {
  if (!Array.isArray(value)) return [];

  return value
    .flatMap((entry): AiCodeHistoryEntry[] => {
      if (!entry || typeof entry !== "object") return [];
      const candidate = entry as Partial<AiCodeHistoryEntry>;
      if (
        typeof candidate.id !== "string" ||
        !candidate.id.trim() ||
        typeof candidate.code !== "string" ||
        !candidate.code.trim() ||
        !isProjectType(candidate.projectType) ||
        typeof candidate.createdAt !== "string" ||
        Number.isNaN(Date.parse(candidate.createdAt))
      ) {
        return [];
      }

      return [{
        id: candidate.id.trim().slice(0, 90),
        code: candidate.code.trim().slice(0, 120_000),
        explanation: typeof candidate.explanation === "string" && candidate.explanation.trim()
          ? candidate.explanation.trim().slice(0, 900)
          : "Le code est prêt. Relisez-le avant de l’utiliser.",
        projectType: candidate.projectType,
        prompt: typeof candidate.prompt === "string" ? candidate.prompt.trim().slice(0, 3500) : "",
        createdAt: candidate.createdAt,
      }];
    })
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
    .slice(0, AI_CODE_HISTORY_LIMIT);
}

/** Ajoute un résultat en tête et retire les doublons ou les résultats les plus anciens. */
export function addAiCodeHistoryEntry(
  history: AiCodeHistoryEntry[],
  entry: AiCodeHistoryEntry,
): AiCodeHistoryEntry[] {
  return readAiCodeHistory([
    entry,
    ...history.filter((existing) => existing.id !== entry.id && existing.code !== entry.code),
  ]);
}

/** Retire une entrée sans modifier les autres codes mémorisés. */
export function removeAiCodeHistoryEntry(history: AiCodeHistoryEntry[], id: string): AiCodeHistoryEntry[] {
  return readAiCodeHistory(history.filter((entry) => entry.id !== id));
}

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
