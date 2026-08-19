import { describe, expect, it } from "vitest";

import { getBuildOutcomeNotification, shouldNotifyBuildStatus } from "../shared/build-notifications";

describe("notifications locales de compilation", () => {
  it("annonce une APK terminée avec une instruction simple", () => {
    expect(getBuildOutcomeNotification({ status: "complete", projectName: "Mon projet" })).toEqual({
      title: "Votre APK est prête",
      body: "Mon projet a terminé sa compilation. Touchez pour la télécharger et l’installer.",
    });
  });

  it("annonce un échec sans afficher de message technique", () => {
    expect(getBuildOutcomeNotification({ status: "failed", projectName: "Mon projet" })?.title).toBe("Compilation à vérifier");
    expect(getBuildOutcomeNotification({ status: "failed", projectName: "Mon projet" })?.body).toContain("Mon projet");
  });

  it("n’annonce ni les statuts provisoires ni deux fois le même résultat", () => {
    expect(getBuildOutcomeNotification({ status: "building", projectName: "Mon projet" })).toBeNull();
    expect(shouldNotifyBuildStatus("building", "complete")).toBe(true);
    expect(shouldNotifyBuildStatus("complete", "complete")).toBe(false);
    expect(shouldNotifyBuildStatus("queued", "building")).toBe(false);
  });
});
