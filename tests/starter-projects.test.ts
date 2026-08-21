import { describe, expect, it } from "vitest";

import { getStarterProject, STARTER_PROJECTS } from "../shared/starter-projects";
import { analyzeProjectEntries } from "../shared/project-preflight";

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
});
