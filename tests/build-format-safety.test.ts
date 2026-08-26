import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(__dirname, "..");
const createScreen = fs.readFileSync(path.join(projectRoot, "app/(tabs)/create.tsx"), "utf8");
const relaySource = fs.readFileSync(path.join(projectRoot, "cloudflare/mia-build-relay.js"), "utf8");

describe("formats Android et Apple", () => {
  it("autorise l’AAB Play Store, mais ne propose aucun envoi IPA Apple", () => {
    expect(createScreen).toContain('onPress={() => setBuildMode("aab")}');
    expect(createScreen).toContain("Ce fichier ne s’installe pas directement sur le téléphone.");
    expect(createScreen).toContain('accessibilityLabel="IPA Apple bientôt disponible"');
    expect(createScreen).toContain('name="lock-outline"');
    expect(createScreen).not.toContain('setBuildMode("ipa")');
  });

  it("n’accepte que les trois formats Android réellement pris en charge par le relais", () => {
    expect(relaySource).toContain('const ALLOWED_BUILD_MODES = new Set(["debug", "signed", "aab"])');
    expect(relaySource).not.toContain('"ipa"');
  });
});
