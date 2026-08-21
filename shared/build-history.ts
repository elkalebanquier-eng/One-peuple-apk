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

function makeSafeApkName(projectName: string, buildId: string) {
  const safeName = projectName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "mia-build";
  return `${safeName}-${buildId.slice(-8)}.apk`;
}

export function getLocalApkFileUri(rootDirectory: string, projectName: string, buildId: string) {
  return `${rootDirectory}${makeSafeApkName(projectName, buildId)}`;
}

export function getLocalBuildDirectory(rootDirectory: string, buildId: string) {
  return `${rootDirectory}one-app/${buildId}/`;
}
