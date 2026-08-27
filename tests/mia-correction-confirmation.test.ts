import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("correction proposée par MIA", () => {
  it("demande une confirmation avant d’ouvrir le code proposé et ne remplace pas le brouillon", () => {
    const source = readFileSync(`${process.cwd()}/app/(tabs)/assistant.tsx`, "utf8");

    expect(source).toContain("function confirmOpenSuggestedCode()");
    expect(source).toContain("Ouvrir la correction proposée ?");
    expect(source).toContain("Votre code actuel ne sera pas remplacé");
    expect(source).toContain("Voir la correction proposée");
    expect(source).not.toContain("setReviewCode(suggestedCode)");
  });
});
