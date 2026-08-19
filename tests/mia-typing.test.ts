import { describe, expect, it } from "vitest";

import { isMiaTypingComplete, nextMiaTypingLength } from "../shared/mia-typing";

describe("animation de frappe MIA", () => {
  it("révèle progressivement une réponse courte sans dépasser sa longueur", () => {
    const text = "Bonjour, je suis MIA.";
    const first = nextMiaTypingLength(text, 0);
    const second = nextMiaTypingLength(text, first);

    expect(first).toBeGreaterThan(0);
    expect(second).toBeGreaterThan(first);
    expect(nextMiaTypingLength(text, text.length - 1)).toBe(text.length);
  });

  it("termine correctement les réponses très longues", () => {
    const text = "M".repeat(1600);
    expect(nextMiaTypingLength(text, 1596)).toBe(1600);
    expect(isMiaTypingComplete(text, 1600)).toBe(true);
    expect(isMiaTypingComplete(text, 1599)).toBe(false);
  });
});
