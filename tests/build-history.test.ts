import { describe, expect, it } from "vitest";

import { canDeleteBuildFromHistory, getLocalApkFileUri, getLocalBuildDirectory } from "../shared/build-history";

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
});
