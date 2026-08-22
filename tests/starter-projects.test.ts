import { describe, expect, it } from "vitest";

import { getStarterProject, STARTER_PROJECTS } from "../shared/starter-projects";
import { analyzeProjectEntries } from "../shared/project-preflight";
import { createLocalHtmlPreview } from "../shared/html-preview";

describe("modèles de départ MIA💻", () => {
  it("propose un modèle pour chaque type de compilation accepté", () => {
    expect(STARTER_PROJECTS.map((starter) => starter.id)).toEqual(["html", "expo", "android"]);
  });

  it.each(["html", "expo", "android"] as const)("produit un modèle %s qui passe le contrôle local", (id) => {
    const starter = getStarterProject(id);
    expect(starter).not.toBeNull();
    const report = analyzeProjectEntries(starter!.projectType, starter!.files.map((file) => file.name));

    expect(report.hasBlockers).toBe(false);
  });

  it("fournit un index.html localement prévisualisable pour le modèle HTML", () => {
    const starter = getStarterProject("html");
    const indexHtml = starter?.files.find((file) => file.name === "index.html")?.content;

    expect(indexHtml).toBeTruthy();
    expect(createLocalHtmlPreview(indexHtml!).html).toContain("Content-Security-Policy");
  });
});
