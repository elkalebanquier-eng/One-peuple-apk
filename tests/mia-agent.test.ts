import { describe, expect, it } from "vitest";

import {
  createMiaAgentAction,
  isMiaAgentActionAvailable,
  requiresAgentConfirmation,
} from "../shared/mia-agent";

describe("Mode Agent MIA", () => {
  it("prépare une action lisible sans l’exécuter", () => {
    const action = createMiaAgentAction("prepare-html-apk");
    expect(action.id).toContain("mia-agent-prepare-html-apk-");
    expect(action.title).toBe("Préparer l’APK HTML");
    expect(action.dataLabel).toContain("index.html");
  });

  it("exige une confirmation pour chaque action préparée", () => {
    expect(requiresAgentConfirmation(createMiaAgentAction("review-latest-code"))).toBe(true);
    expect(createMiaAgentAction("review-latest-code").consequence).toContain("Aucun code n’est remplacé");
    expect(requiresAgentConfirmation(createMiaAgentAction("copy-latest-code"))).toBe(true);
    expect(createMiaAgentAction("preview-latest-code").consequence).toContain("ni modifié ni envoyé");
    expect(createMiaAgentAction("start-html-project").dataLabel).toContain("Aucun fichier");
    expect(requiresAgentConfirmation(null)).toBe(false);
  });

  it("ne propose que les actions Agent réalisables avec les données présentes", () => {
    const emptyContext = { hasLatestCode: false, isHtmlProject: true, hasLogo: false };
    expect(isMiaAgentActionAvailable("start-html-project", emptyContext)).toBe(true);
    expect(isMiaAgentActionAvailable("review-latest-code", emptyContext)).toBe(false);
    expect(isMiaAgentActionAvailable("copy-latest-code", emptyContext)).toBe(false);
    expect(isMiaAgentActionAvailable("prepare-html-apk", emptyContext)).toBe(false);

    const htmlContext = { hasLatestCode: true, isHtmlProject: true, hasLogo: true };
    expect(isMiaAgentActionAvailable("review-latest-code", htmlContext)).toBe(true);
    expect(isMiaAgentActionAvailable("prepare-html-apk", htmlContext)).toBe(true);
    expect(isMiaAgentActionAvailable("use-logo-as-icon", htmlContext)).toBe(true);
  });
});
