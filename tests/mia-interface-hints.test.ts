import { describe, expect, it } from "vitest";

import { shouldShowMiaConnectorsHint } from "../shared/mia-interface-hints";

describe("infobulle Connecteurs MIA", () => {
  it("s’affiche lorsque l’aide n’a encore jamais été montrée", () => {
    expect(shouldShowMiaConnectorsHint(null)).toBe(true);
  });

  it("ne s’affiche plus après le premier affichage enregistré", () => {
    expect(shouldShowMiaConnectorsHint("1")).toBe(false);
  });
});
