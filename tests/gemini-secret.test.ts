import { describe, expect, it } from "vitest";

describe.skip("Gemini server credential", () => {
  it("ne réalise aucun appel Gemini tant que KIA est désactivé dans MIA💻", () => {
    // KIA est volontairement indisponible : aucun secret ou appel externe ne doit être requis par les tests mobiles.
  });
});
