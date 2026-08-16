import { describe, expect, it } from "vitest";

import { createSingleFileZip } from "../lib/html-zip";
import { isHtmlFile, validateProjectArchive } from "../lib/project-import";

describe("import HTML direct", () => {
  it("accepte les extensions HTML et préserve le ZIP pour les autres projets", () => {
    expect(isHtmlFile("index.html")).toBe(true);
    expect(isHtmlFile("landing.HTM")).toBe(true);
    expect(isHtmlFile("index.zip")).toBe(false);
    expect(validateProjectArchive("index.html", 10).valid).toBe(false);
  });

  it("prépare une archive ZIP standard avec index.html", () => {
    const archive = createSingleFileZip("index.html", new TextEncoder().encode("<h1>Bonjour</h1>"));
    expect(Array.from(archive.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(new TextDecoder().decode(archive)).toContain("index.html");
    expect(Array.from(archive.slice(-22, -18))).toEqual([0x50, 0x4b, 0x05, 0x06]);
  });
});
