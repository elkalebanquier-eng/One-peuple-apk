import { describe, expect, it } from "vitest";

import { MAX_SOURCE_SIZE, validateProjectArchive } from "../lib/project-import";

describe("validation des archives KIKO Studio", () => {
  it("accepte une archive ZIP sous la limite", () => {
    expect(validateProjectArchive("mon-projet.ZIP", 1024)).toEqual({ valid: true, reason: null });
  });

  it("refuse un fichier qui n’est pas un ZIP", () => {
    expect(validateProjectArchive("index.html", 1024)).toEqual({ valid: false, reason: "Archive ZIP requise" });
  });

  it("refuse une archive dépassant la taille admise", () => {
    expect(validateProjectArchive("projet.zip", MAX_SOURCE_SIZE + 1)).toEqual({ valid: false, reason: "Archive trop grande" });
  });
});
