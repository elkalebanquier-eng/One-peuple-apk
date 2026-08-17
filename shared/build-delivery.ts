const WORKER_OWNER = "elkalebanquier-eng";
const WORKER_REPOSITORY = "one-app-build-worker";

/**
 * Every temporary release uses the build id in both its tag and asset name.
 * Keeping this derivation shared lets the server and the phone recover a
 * published APK even if the short-lived status record is lost after a restart.
 */
export function getExpectedApkUrl(buildId: string) {
  const tag = `one-app-build-${buildId}`;
  return `https://github.com/${WORKER_OWNER}/${WORKER_REPOSITORY}/releases/download/${tag}/one-app-${buildId}.apk`;
}
