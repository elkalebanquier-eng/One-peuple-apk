import { describe, expect, it } from "vitest";

import { connectorStateLabel, MIA_CONNECTORS } from "../shared/mia-connectors";

describe("connecteurs MIA", () => {
  it("déclare les quatre services affichés sans stocker de donnée sensible", () => {
    expect(MIA_CONNECTORS.map((connector) => connector.id)).toEqual(["github", "browser", "cloudflare", "gemini"]);
    expect(MIA_CONNECTORS.every((connector) => !connector.detail.toLowerCase().includes("mot de passe"))).toBe(true);
  });

  it("donne un libellé clair à chaque état de connecteur", () => {
    expect(connectorStateLabel("planned")).toBe("À préparer");
    expect(connectorStateLabel("protected")).toBe("Protégé");
    expect(connectorStateLabel("internal")).toBe("Service MIA");
    expect(connectorStateLabel("disabled")).toBe("Désactivé");
  });
});
