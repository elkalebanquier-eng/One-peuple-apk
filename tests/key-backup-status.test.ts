import { describe, expect, it } from "vitest";

import { getKeyBackupState } from "../shared/key-backup-status";

describe("état local de sauvegarde de clé", () => {
  it("ne demande aucune sauvegarde pour une APK debug", () => {
    expect(getKeyBackupState({ buildMode: "debug", keyBackupAvailable: true })).toBe("not-required");
  });

  it("rappelle la sauvegarde pour un AAB dont le ZIP privé est disponible", () => {
    expect(getKeyBackupState({ buildMode: "aab", keyBackupAvailable: true })).toBe("needs-save");
  });

  it("affiche la confirmation uniquement après un choix local explicite", () => {
    expect(getKeyBackupState({ buildMode: "signed", keyBackupAvailable: true, keyBackupSavedAt: "2026-08-26T12:00:00.000Z" })).toBe("saved");
  });
});
