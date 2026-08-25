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

  it("transforme une limite temporaire en attente suivie d’une relance", () => {
    const help = getBuildErrorHelp({ projectName: "Mon projet", projectType: "expo", message: "quota exceeded 429" });

    expect(help.title).toBe("La limite de compilations est atteinte");
    expect(help.nextStep).toContain("Relancer");
  });

  it("n’accuse pas le code lorsqu’une connexion au moteur échoue", () => {
    const help = getBuildErrorHelp({ projectName: "Ma page", projectType: "html", message: "network timeout" });

    expect(help.title).toBe("La connexion au moteur a été interrompue");
    expect(help.summary).toContain("projet est toujours");
  });

  it("oriente un ZIP refusé vers le bon fichier", () => {
    const help = getBuildErrorHelp({ projectName: "Mon app", projectType: "android", message: "archive ZIP trop grand" });

    expect(help.title).toBe("Le fichier du projet doit être vérifié");
    expect(help.nextStep).toContain("ZIP");
  });
});
