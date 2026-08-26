import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("préparation Apple", () => {
  const createScreen = readFileSync(join(process.cwd(), "app/(tabs)/create.tsx"), "utf8");
  const appleGuide = readFileSync(join(process.cwd(), "docs/mia-apple-preparation.md"), "utf8");

  it("explique les prérequis d’une IPA sans rendre le format sélectionnable", () => {
    expect(createScreen).toContain("Préparer Apple avant de compiler");
    expect(createScreen).toContain("compte Apple Developer");
    expect(createScreen).not.toContain('setBuildMode("ipa")');
    expect(createScreen).not.toContain('setBuildMode("apple")');
  });

  it("conserve une fiche écrite des éléments de signature nécessaires", () => {
    expect(appleGuide).toContain("certificat");
    expect(appleGuide).toContain("profil de provisionnement");
    expect(appleGuide).toContain("macOS");
  });
});
