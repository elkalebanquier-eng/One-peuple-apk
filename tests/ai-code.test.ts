import { describe, expect, it } from "vitest";

import {
  addAiCodeHistoryEntry,
  AI_CODE_HISTORY_LIMIT,
  getAiFailureMessage,
  readAiCodeHistory,
  readAiCodeResponse,
  removeAiCodeHistoryEntry,
  type AiCodeHistoryEntry,
} from "../shared/ai-code";

describe("réponses de l’assistant IA", () => {
  it("accepte le code généré et ajoute une explication sûre si elle manque", () => {
    expect(readAiCodeResponse('{"code":"  <h1>Bonjour</h1>  "}')).toEqual({
      code: "<h1>Bonjour</h1>",
      explanation: "Le code est prêt. Relisez-le avant de l’utiliser.",
      checklist: [],
    });
  });

  it("préserve au plus quatre vérifications professionnelles sûres", () => {
    const response = readAiCodeResponse(JSON.stringify({
      code: "<html><body>Bonjour</body></html>",
      checklist: ["Vérifier le titre", "Tester le bouton", 12, "", "Relire les textes", "Cinquième élément"],
    }));

    expect(response?.checklist).toEqual(["Vérifier le titre", "Tester le bouton", "Relire les textes", "Cinquième élément"]);
  });

  it("refuse une réponse vide ou qui ne contient pas de code", () => {
    expect(readAiCodeResponse('{"explanation":"Voici une idée"}')).toBeNull();
    expect(readAiCodeResponse("réponse non JSON")).toBeNull();
  });

  it("affiche le message français de limitation sans révéler de détail technique", () => {
    expect(getAiFailureMessage("", 429)).toBe("Vous avez beaucoup utilisé l’assistant. Attendez une heure puis réessayez.");
    expect(getAiFailureMessage('{"message":"Demande trop grande"}', 400)).toBe("Demande trop grande");
  });

  it("conserve uniquement des entrées d’historique valides, de la plus récente à la plus ancienne", () => {
    const history = readAiCodeHistory([
      { id: "old", code: "<h1>Ancien</h1>", explanation: "Ancien", prompt: "Ancien", projectType: "html", createdAt: "2026-08-16T10:00:00.000Z" },
      { id: "bad", code: "", projectType: "html", createdAt: "2026-08-17T10:00:00.000Z" },
      { id: "new", code: "<h1>Nouveau</h1>", explanation: "Nouveau", prompt: "Nouveau", projectType: "html", createdAt: "2026-08-17T10:00:00.000Z" },
    ]);

    expect(history.map((entry) => entry.id)).toEqual(["new", "old"]);
  });

  it("place un nouveau code en tête, évite les doublons et respecte la limite locale", () => {
    const older: AiCodeHistoryEntry[] = Array.from({ length: AI_CODE_HISTORY_LIMIT }, (_, index) => ({
      id: `old-${index}`,
      code: `<p>${index}</p>`,
      explanation: "Code prêt",
      prompt: `Demande ${index}`,
      projectType: "html",
      createdAt: `2026-08-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`,
    }));
    const next = addAiCodeHistoryEntry(older, {
      id: "new",
      code: "<main>Bonjour</main>",
      explanation: "Code prêt",
      prompt: "Nouvelle demande",
      projectType: "html",
      createdAt: "2026-08-31T10:00:00.000Z",
    });

    expect(next).toHaveLength(AI_CODE_HISTORY_LIMIT);
    expect(next[0]?.id).toBe("new");
    expect(next.filter((entry) => entry.code === "<main>Bonjour</main>")).toHaveLength(1);
  });

  it("supprime seulement l’ancien code choisi", () => {
    const source = readAiCodeHistory([
      { id: "keep", code: "<p>À garder</p>", explanation: "Garder", prompt: "Garder", projectType: "html", createdAt: "2026-08-17T10:00:00.000Z" },
      { id: "remove", code: "<p>À retirer</p>", explanation: "Retirer", prompt: "Retirer", projectType: "expo", createdAt: "2026-08-18T10:00:00.000Z" },
    ]);

    expect(removeAiCodeHistoryEntry(source, "remove").map((entry) => entry.id)).toEqual(["keep"]);
  });
});
