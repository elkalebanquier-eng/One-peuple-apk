export type BuildHistoryStatus = "draft" | "ready" | "queued" | "building" | "complete" | "failed";
export type BuildHistoryFilter = "all" | "complete" | "failed";

/** Une compilation en cours reste protégée contre une suppression accidentelle. */
export function canDeleteBuildFromHistory(status: BuildHistoryStatus) {
  return status !== "queued" && status !== "building";
}

/** Limite l’affichage sans altérer les données conservées sur le téléphone. */
export function matchesBuildHistoryFilter(status: BuildHistoryStatus, filter: BuildHistoryFilter) {
  if (filter === "all") return true;
  return status === filter;
}

/** Les builds en file ou en cours restent visibles et ne font jamais partie d’un nettoyage global. */
export function countDeletableBuilds(statuses: BuildHistoryStatus[]) {
  return statuses.filter(canDeleteBuildFromHistory).length;
}

function makeSafeArtifactName(projectName: string, buildId: string, artifactType: "apk" | "aab") {
  const safeName = projectName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "mia-build";
  return `${safeName}-${buildId.slice(-8)}.${artifactType}`;
}

export function getLocalApkFileUri(rootDirectory: string, projectName: string, buildId: string) {
  return getLocalArtifactFileUri(rootDirectory, projectName, buildId, "apk");
}

export function getLocalArtifactFileUri(rootDirectory: string, projectName: string, buildId: string, artifactType: "apk" | "aab") {
  return `${rootDirectory}${makeSafeArtifactName(projectName, buildId, artifactType)}`;
}

export function getLocalBuildDirectory(rootDirectory: string, buildId: string) {
  return `${rootDirectory}one-app/${buildId}/`;
}
