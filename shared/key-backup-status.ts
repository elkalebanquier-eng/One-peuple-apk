export type KeyBackupState = "not-required" | "needs-save" | "saved";

/**
 * État purement local de l’étape de sauvegarde. Ni la clé, ni son mot de passe,
 * ni le lien privé ne passent par ce contrat.
 */
export function getKeyBackupState(input: {
  buildMode: "debug" | "signed" | "aab";
  keyBackupAvailable?: boolean;
  keyBackupSavedAt?: string;
}): KeyBackupState {
  if ((input.buildMode !== "signed" && input.buildMode !== "aab") || !input.keyBackupAvailable) {
    return "not-required";
  }
  return input.keyBackupSavedAt ? "saved" : "needs-save";
}
