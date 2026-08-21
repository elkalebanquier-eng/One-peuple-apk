export type BuildHistoryStatus = "draft" | "ready" | "queued" | "building" | "complete" | "failed";

/** Une compilation en cours reste protégée contre une suppression accidentelle. */
export function canDeleteBuildFromHistory(status: BuildHistoryStatus) {
  return status !== "queued" && status !== "building";
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
