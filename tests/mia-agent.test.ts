import { describe, expect, it } from "vitest";

import { createMiaAgentAction, requiresAgentConfirmation } from "../shared/mia-agent";

describe("Mode Agent MIA", () => {
  it("prépare une action lisible sans l’exécuter", () => {
    const action = createMiaAgentAction("prepare-html-apk");
    expect(action.id).toContain("mia-agent-prepare-html-apk-");
    expect(action.title).toBe("Préparer l’APK HTML");
    expect(action.dataLabel).toContain("index.html");
  });

  it("exige une confirmation pour chaque action préparée", () => {
    expect(requiresAgentConfirmation(createMiaAgentAction("review-latest-code"))).toBe(true);
    expect(requiresAgentConfirmation(createMiaAgentAction("copy-latest-code"))).toBe(true);
    expect(createMiaAgentAction("preview-latest-code").consequence).toContain("ni modifié ni envoyé");
    expect(createMiaAgentAction("start-html-project").dataLabel).toContain("Aucun fichier");
    expect(requiresAgentConfirmation(null)).toBe(false);
  });
});
