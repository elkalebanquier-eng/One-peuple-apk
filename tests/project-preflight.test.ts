import { describe, expect, it } from "vitest";

import { analyzeProjectEntries } from "../shared/project-preflight";

describe("contrôle local avant compilation", () => {
  it("bloque un ZIP HTML sans index.html", () => {
    const report = analyzeProjectEntries("html", ["assets/style.css"]);

    expect(report.hasBlockers).toBe(true);
    expect(report.findings.some((finding) => finding.message.includes("index.html"))).toBe(true);
  });

  it("accepte une structure Expo minimale et signale seulement un écran manquant", () => {
    const report = analyzeProjectEntries("expo", ["package.json", "app.json", "App.js"]);

    expect(report.hasBlockers).toBe(false);
    expect(report.findings.some((finding) => finding.level === "check")).toBe(true);
  });

  it("protège le téléphone contre les ZIP avec fichiers de build inutiles ou chemins non autorisés", () => {
    const report = analyzeProjectEntries("android", ["settings.gradle", "app/build.gradle", "gradlew", "node_modules/react/index.js", "../secret.txt"]);

    expect(report.hasBlockers).toBe(true);
    expect(report.findings.filter((finding) => finding.level === "blocker")).toHaveLength(2);
  });
});
