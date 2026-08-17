import { describe, expect, it } from "vitest";

import { getGeneratedPackageName, readAppIdentity } from "../shared/app-identity";

describe("readAppIdentity", () => {
  it("accepte un package Android et calcule un versionCode stable", () => {
    expect(readAppIdentity("com.onepeuple.mamoney", "2.5.3")).toEqual({
      valid: true,
      packageName: "com.onepeuple.mamoney",
      appVersion: "2.5.3",
      versionCode: 20503,
    });
  });

  it("refuse un package ou une version incompréhensible", () => {
    expect(readAppIdentity("Mon Application", "1.0.0").valid).toBe(false);
    expect(readAppIdentity("com.onepeuple.mamoney", "version deux").valid).toBe(false);
  });

  it("fabrique un package de secours distinct pour une ancienne version de One App", () => {
    expect(getGeneratedPackageName("build-1234567890-abcdef")).toBe("com.oneapp.generated.1234567890abcdef");
  });
});
