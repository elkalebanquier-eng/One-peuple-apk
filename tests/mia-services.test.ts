import { describe, expect, it } from "vitest";

import { getMiaServiceStatuses } from "../shared/mia-services";

describe("statut des services MIA", () => {
  it("affiche un statut prêt sans exposer un secret ou un dépôt", () => {
    const statuses = getMiaServiceStatuses("ready");
    const content = statuses.map((service) => `${service.title} ${service.detail}`).join(" ").toLocaleLowerCase("fr-FR");

    expect(statuses.find((service) => service.id === "build")?.state).toBe("active");
    expect(content).not.toContain("token");
    expect(content).not.toContain("dépôt");
  });

  it("indique simplement lorsqu’une connexion doit être vérifiée", () => {
    const relay = getMiaServiceStatuses("offline").find((service) => service.id === "relay");

    expect(relay?.state).toBe("attention");
    expect(relay?.detail).toContain("Internet");
  });
});
