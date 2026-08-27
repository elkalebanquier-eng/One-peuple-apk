export type AppleSigningPreparation = {
  bundleIdentifier: string;
  appleTeamId: string;
  certificateName: string;
  profileName: string;
  appVersion: string;
  buildNumber: string;
  certificatePrepared: boolean;
  profilePrepared: boolean;
};

export const EMPTY_APPLE_SIGNING_PREPARATION: AppleSigningPreparation = {
  bundleIdentifier: "",
  appleTeamId: "",
  certificateName: "",
  profileName: "",
  appVersion: "1.0.0",
  buildNumber: "1",
  certificatePrepared: false,
  profilePrepared: false,
};

const BUNDLE_IDENTIFIER = /^[A-Za-z][A-Za-z0-9-]*(?:\.[A-Za-z][A-Za-z0-9-]*)+$/;
const TEAM_IDENTIFIER = /^[A-Z0-9]{10}$/;

/** Le service macOS de signature Apple n'est pas encore configuré dans MIA💻. */
export const APPLE_IPA_PIPELINE_AVAILABLE = false;

/** Ce contrat ne décrit que des repères non secrets, jamais un fichier ou une clé de signature. */
export function sanitizeAppleSigningPreparation(input: Partial<AppleSigningPreparation>): AppleSigningPreparation {
  return {
    bundleIdentifier: typeof input.bundleIdentifier === "string" ? input.bundleIdentifier.trim() : "",
    appleTeamId: typeof input.appleTeamId === "string" ? input.appleTeamId.trim().toUpperCase() : "",
    certificateName: typeof input.certificateName === "string" ? input.certificateName.trim() : "",
    profileName: typeof input.profileName === "string" ? input.profileName.trim() : "",
    appVersion: typeof input.appVersion === "string" && input.appVersion.trim() ? input.appVersion.trim() : "1.0.0",
    buildNumber: typeof input.buildNumber === "string" && input.buildNumber.trim() ? input.buildNumber.trim() : "1",
    certificatePrepared: input.certificatePrepared === true,
    profilePrepared: input.profilePrepared === true,
  };
}

export function getApplePreparationIssues(preparation: AppleSigningPreparation) {
  const issues: string[] = [];
  if (!preparation.bundleIdentifier) issues.push("Ajoutez l’identifiant de l’application iOS.");
  else if (!BUNDLE_IDENTIFIER.test(preparation.bundleIdentifier)) issues.push("Utilisez un identifiant iOS comme com.monentreprise.monapp.");
  if (!preparation.appleTeamId) issues.push("Ajoutez l’identifiant de votre équipe Apple.");
  else if (!TEAM_IDENTIFIER.test(preparation.appleTeamId)) issues.push("L’identifiant d’équipe Apple comporte 10 lettres ou chiffres.");
  if (!preparation.certificateName) issues.push("Notez le nom du certificat de distribution préparé dans Apple Developer.");
  if (!preparation.certificatePrepared) issues.push("Créez ou sélectionnez d’abord le certificat de distribution dans Apple Developer.");
  if (!preparation.profileName) issues.push("Notez le nom du profil App Store Connect associé à l’application.");
  if (!preparation.profilePrepared) issues.push("Préparez un profil App Store Connect associé au même identifiant d’application.");
  return issues;
}

export function getApplePreparationState(preparation: AppleSigningPreparation) {
  const issues = getApplePreparationIssues(preparation);
  return {
    ready: issues.length === 0,
    ipaAvailable: APPLE_IPA_PIPELINE_AVAILABLE,
    issues,
    label: issues.length === 0 ? "Repères Apple préparés" : `${issues.length} élément${issues.length > 1 ? "s" : ""} à préparer`,
  };
}
