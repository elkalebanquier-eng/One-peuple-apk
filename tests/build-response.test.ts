import { describe, expect, it } from "vitest";

import { readBuildResponse } from "../lib/build-response";

describe("réponses du moteur de build", () => {
  it("lit une réponse JSON valide", () => {
    expect(readBuildResponse('{"status":"queued","message":"Reçu"}', 202)).toEqual({ status: "queued", message: "Reçu" });
  });

  it("masque une page HTML reçue à la place du JSON", () => {
    expect(() => readBuildResponse("<html>Bad gateway</html>", 502)).toThrow("moteur de compilation est momentanément indisponible");
  });
});
