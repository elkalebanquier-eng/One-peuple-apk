import { describe, expect, it } from "vitest";

import { getSafeArchiveRepairProposal } from "../shared/project-auto-repair";

describe("getSafeArchiveRepairProposal", () => {
  it("propose uniquement de retirer les dossiers générés signalés par le contrôle local", () => {
    const proposal = getSafeArchiveRepairProposal({
      preflight: {
        entryCount: 4,
        hasBlockers: true,
        findings: [
          { level: "blocker", message: "Retirez « node_modules » du ZIP avant l’envoi." },
          { level: "blocker", message: "Retirez « dist » du ZIP avant l’envoi." },
          { level: "warning", message: "Vérifiez le point de départ." },
        ],
      },
    });

    expect(proposal).toMatchObject({ folders: ["node_modules", "dist"] });
    expect(proposal?.summary).toContain("ZIP original reste inchangé");
  });

  it("ne propose rien pour une structure manquante ou un HTML déjà préparé", () => {
    const preflight = { entryCount: 1, hasBlockers: true, findings: [{ level: "blocker" as const, message: "Ajoutez package.json à votre projet Expo." }] };
    expect(getSafeArchiveRepairProposal({ preflight })).toBeNull();
    expect(getSafeArchiveRepairProposal({ preflight: { ...preflight, findings: [{ level: "blocker", message: "Retirez « node_modules » du ZIP avant l’envoi." }] }, preparedFromHtml: true })).toBeNull();
  });
});
