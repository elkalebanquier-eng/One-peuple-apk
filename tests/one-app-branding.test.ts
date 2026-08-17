import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import config from "../app.config";

describe("One App branding", () => {
  it("expose One App as the application name", () => {
    expect(config.name).toBe("One App");
  });

  it("applique le logo One Peuple à toutes les ressources de lancement", () => {
    const sharedAssets = [
      "icon.png",
      "splash-icon.png",
      "android-icon-foreground.png",
      "android-icon-background.png",
      "android-icon-monochrome.png",
    ].map((name) => readFileSync(resolve(process.cwd(), "assets/images", name)).toString("base64"));

    const favicon = readFileSync(resolve(process.cwd(), "assets/images", "favicon.png"));
    expect(new Set(sharedAssets).size).toBe(1);
    expect(favicon.byteLength).toBeGreaterThan(0);
  });
});
