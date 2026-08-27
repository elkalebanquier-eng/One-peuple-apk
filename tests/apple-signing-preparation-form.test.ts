import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  EMPTY_APPLE_SIGNING_PREPARATION,
  getApplePreparationState,
  sanitizeAppleSigningPreparation,
} from "../shared/apple-signing-preparation";

describe("préparation de signature Apple", () => {
  it("ne conserve que des repères non secrets et normalise l’identifiant d’équipe", () => {
    const preparation = sanitizeAppleSigningPreparation({
      bundleIdentifier: " com.exemple.mia ",
      appleTeamId: "ab12cd34ef",
      certificateName: " Distribution MIA ",
      profileName: " App Store MIA ",
      certificatePrepared: true,
      profilePrepared: true,
    });

    expect(preparation).toEqual({
      bundleIdentifier: "com.exemple.mia",
      appleTeamId: "AB12CD34EF",
      certificateName: "Distribution MIA",
      profileName: "App Store MIA",
      appVersion: "1.0.0",
      buildNumber: "1",
      certificatePrepared: true,
      profilePrepared: true,
    });
  });

  it("garde l’IPA verrouillée tant que les prérequis Apple ne sont pas préparés", () => {
    expect(getApplePreparationState(EMPTY_APPLE_SIGNING_PREPARATION).ready).toBe(false);
    expect(getApplePreparationState({
      ...EMPTY_APPLE_SIGNING_PREPARATION,
      bundleIdentifier: "com.exemple.mia",
      appleTeamId: "AB12CD34EF",
      certificatePrepared: true,
      profilePrepared: true,
    }).ready).toBe(true);
  });

  it("ne comporte ni téléversement de certificat ni stockage de secret", () => {
    const sheet = readFileSync("components/apple-signing-preparation-sheet.tsx", "utf8");
    const store = readFileSync("lib/apple-signing-preparation-store.ts", "utf8");

    expect(sheet).not.toContain("DocumentPicker");
    expect(sheet).not.toContain("FileSystem");
    expect(sheet).toContain(".p12");
    expect(sheet).toContain(".mobileprovision");
    expect(store).not.toContain("SecureStore");
    expect(store).not.toContain("password");
  });
});
