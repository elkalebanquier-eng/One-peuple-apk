import { describe, expect, it } from "vitest";

import {
  CONNECTOR_CATEGORIES,
  connectorStateLabel,
  filterMiaConnectors,
  getMiaConnectorAction,
  MIA_CONNECTORS,
} from "../shared/mia-connectors";

describe("catalogue de connecteurs MIA", () => {
  it("présente un catalogue de nombreux services avec des catégories", () => {
    expect(MIA_CONNECTORS.length).toBeGreaterThanOrEqual(20);
    expect(CONNECTOR_CATEGORIES).toEqual(["Tous", "Code", "IA", "Fichiers", "Organisation", "Publication"]);
    expect(MIA_CONNECTORS.map((connector) => connector.id)).toContain("github");
    expect(MIA_CONNECTORS.map((connector) => connector.id)).toContain("google-drive");
    expect(MIA_CONNECTORS.map((connector) => connector.id)).toContain("notion");
  });

  it("ne présente aucun élément du catalogue comme une connexion existante", () => {
    expect(MIA_CONNECTORS.some((connector) => connector.status.toLowerCase() === "connecté")).toBe(false);
    expect(MIA_CONNECTORS.every((connector) => !connector.detail.toLowerCase().includes("mot de passe"))).toBe(true);
  });

  it("filtre les services par catégorie et par recherche", () => {
    expect(filterMiaConnectors("", "Fichiers").map((connector) => connector.id)).toContain("google-drive");
    expect(filterMiaConnectors("notion", "Tous").map((connector) => connector.id)).toEqual(["notion"]);
    expect(filterMiaConnectors("", "IA").map((connector) => connector.id)).toEqual(["gemini", "hugging-face"]);
  });

  it("donne un libellé clair à chaque état de connecteur", () => {
    expect(connectorStateLabel("planned")).toBe("À configurer");
    expect(connectorStateLabel("protected")).toBe("Protégé");
    expect(connectorStateLabel("internal")).toBe("Service MIA");
    expect(connectorStateLabel("catalog")).toBe("Catalogue");
    expect(connectorStateLabel("disabled")).toBe("Désactivé");
  });

  it("propose une action simple sans annoncer une connexion réelle", () => {
    const github = MIA_CONNECTORS.find((connector) => connector.id === "github");
    const cloudflare = MIA_CONNECTORS.find((connector) => connector.id === "cloudflare");
    const gemini = MIA_CONNECTORS.find((connector) => connector.id === "gemini");

    expect(github && getMiaConnectorAction(github)).toMatchObject({ label: "Connecter", available: false });
    expect(cloudflare && getMiaConnectorAction(cloudflare)).toMatchObject({ label: "Service MIA", available: false });
    expect(gemini && getMiaConnectorAction(gemini)).toMatchObject({ label: "Indisponible", available: false });
  });
});
