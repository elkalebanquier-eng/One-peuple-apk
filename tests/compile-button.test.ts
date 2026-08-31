import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("bouton Compiler MIA", () => {
  const source = readFileSync(resolve(process.cwd(), "app/(tabs)/create.tsx"), "utf8");

  it("explique les étapes manquantes au lieu de ne rien faire", () => {
    expect(source).toContain('Alert.alert("Choisissez un type"');
    expect(source).toContain('Alert.alert("Ajoutez votre projet"');
    expect(source).toContain('Alert.alert("Donnez un nom au projet"');
  });

  it("reste désactivé uniquement pendant l’envoi", () => {
    expect(source).toContain("disabled={saving} onPress={handlePrepareBuild}");
    expect(source).not.toContain("disabled={!canPrepare} onPress={handlePrepareBuild}");
  });
});

