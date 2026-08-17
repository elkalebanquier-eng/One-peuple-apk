import { describe, expect, it } from "vitest";

import { getAiFailureMessage, readAiCodeResponse } from "../shared/ai-code";

describe("réponses de l’assistant IA", () => {
  it("accepte le code généré et ajoute une explication sûre si elle manque", () => {
    expect(readAiCodeResponse('{"code":"  <h1>Bonjour</h1>  "}')).toEqual({
      code: "<h1>Bonjour</h1>",
      explanation: "Le code est prêt. Relisez-le avant de l’utiliser.",
    });
  });

  it("refuse une réponse vide ou qui ne contient pas de code", () => {
    expect(readAiCodeResponse('{"explanation":"Voici une idée"}')).toBeNull();
    expect(readAiCodeResponse("réponse non JSON")).toBeNull();
  });

  it("affiche le message français de limitation sans révéler de détail technique", () => {
    expect(getAiFailureMessage("", 429)).toBe("Vous avez beaucoup utilisé l’assistant. Attendez une heure puis réessayez.");
    expect(getAiFailureMessage('{"message":"Demande trop grande"}', 400)).toBe("Demande trop grande");
  });
});
