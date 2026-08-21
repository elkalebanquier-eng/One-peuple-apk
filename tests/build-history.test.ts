import { describe, expect, it } from "vitest";

import { canDeleteBuildFromHistory, countDeletableBuilds, getLocalApkFileUri, getLocalBuildDirectory, matchesBuildHistoryFilter } from "../shared/build-history";

describe("suppression de l’historique local", () => {
  it("protège une compilation encore en file ou en cours", () => {
    expect(canDeleteBuildFromHistory("queued")).toBe(false);
    expect(canDeleteBuildFromHistory("building")).toBe(false);
    expect(canDeleteBuildFromHistory("failed")).toBe(true);
    expect(canDeleteBuildFromHistory("complete")).toBe(true);
  });

  it("cible uniquement le dossier du build et son APK mise en cache", () => {
    expect(getLocalBuildDirectory("file:///data/", "build-123")).toBe("file:///data/one-app/build-123/");
    expect(getLocalApkFileUri("file:///data/", "Mon projet", "build-12345678")).toBe("file:///data/mon-projet-12345678.apk");
  });

  it("filtre uniquement les APK terminées ou les compilations qui demandent une action", () => {
    expect(matchesBuildHistoryFilter("complete", "complete")).toBe(true);
    expect(matchesBuildHistoryFilter("failed", "complete")).toBe(false);
    expect(matchesBuildHistoryFilter("failed", "failed")).toBe(true);
    expect(matchesBuildHistoryFilter("queued", "all")).toBe(true);
  });

  it("compte seulement les entrées pouvant être nettoyées et conserve les builds actifs", () => {
    expect(countDeletableBuilds(["complete", "failed", "queued", "building"])).toBe(2);
    expect(countDeletableBuilds(["queued", "building"])).toBe(0);
  });
});
