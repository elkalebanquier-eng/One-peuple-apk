import { describe, expect, it } from "vitest";

import { normalizeBuildProgress, readBuildProgressEvents } from "../shared/build-progress";

describe("suivi de progression de compilation", () => {
  it("borne le pourcentage dans la plage visible", () => {
    expect(normalizeBuildProgress(-2)).toBe(0);
    expect(normalizeBuildProgress(42.6)).toBe(43);
    expect(normalizeBuildProgress(180)).toBe(100);
    expect(normalizeBuildProgress("50", 12)).toBe(12);
  });

  it("conserve seulement les événements lisibles et récents", () => {
    const events = readBuildProgressEvents([
      { progress: 24, message: "Fichier reçu.", createdAt: "2026-08-21T10:00:00.000Z" },
      { progress: "invalid", message: "À ignorer", createdAt: "" },
      { progress: 65, message: "Compilation Android en cours.", createdAt: "2026-08-21T10:01:00.000Z" },
    ]);

    expect(events).toEqual([
      { progress: 24, message: "Fichier reçu.", createdAt: "2026-08-21T10:00:00.000Z" },
      { progress: 65, message: "Compilation Android en cours.", createdAt: "2026-08-21T10:01:00.000Z" },
    ]);
  });
});
