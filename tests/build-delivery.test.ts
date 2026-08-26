import { describe, expect, it } from "vitest";

import { getExpectedApkUrl, getExpectedArtifactUrl } from "../shared/build-delivery";

describe("temporary APK delivery", () => {
  it("derives the exact release asset URL from a build id", () => {
    const buildId = "build-1723910000000-ab12cd";
    expect(getExpectedApkUrl(buildId)).toBe(
      "https://github.com/elkalebanquier-eng/one-app-build-worker/releases/download/one-app-build-build-1723910000000-ab12cd/one-app-build-1723910000000-ab12cd.apk",
    );
  });

  it("derives a separate AAB delivery URL for Google Play", () => {
    const buildId = "build-1723910000000-ab12cd";
    expect(getExpectedArtifactUrl(buildId, "aab")).toBe(
      "https://github.com/elkalebanquier-eng/one-app-build-worker/releases/download/one-app-build-build-1723910000000-ab12cd/one-app-build-1723910000000-ab12cd.aab",
    );
  });
});
