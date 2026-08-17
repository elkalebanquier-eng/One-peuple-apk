import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import config from "../app.config";

describe("One App branding", () => {
  it("expose One App as the application name", () => {
    expect(config.name).toBe("One App");
  });

  it("applique le logo One Peuple à toutes les ressources de lancement", () => {
    const assets = [
      "icon.png",
      "splash-icon.png",
      "favicon.png",
      "android-icon-foreground.png",
      "android-icon-background.png",
      "android-icon-monochrome.png",
    ].map((name) => readFileSync(resolve(process.cwd(), "assets/images", name)).toString("base64"));

    expect(new Set(assets).size).toBe(1);
  });
});
