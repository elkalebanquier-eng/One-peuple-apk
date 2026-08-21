import { describe, expect, it } from "vitest";

import { getBuildErrorHelp } from "../shared/build-error-help";

describe("aide après erreur de compilation", () => {
  it("oriente une compilation expirée vers Relancer sans accuser le code", () => {
    const help = getBuildErrorHelp({ projectName: "Ma page", projectType: "html", message: "Cette compilation est introuvable." });

    expect(help.title).toBe("Cette demande a expiré");
    expect(help.nextStep).toContain("Relancer");
  });

  it("explique une structure Android Gradle incomplète en langage simple", () => {
    const help = getBuildErrorHelp({ projectName: "Mon Android", projectType: "android", message: "settings.gradle missing" });

    expect(help.title).toBe("La structure Android est incomplète");
    expect(help.miaPrompt).toContain("Gradle");
  });
});
