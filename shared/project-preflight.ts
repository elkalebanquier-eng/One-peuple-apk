import type { ProjectType } from "@/lib/build-store";

export type PreflightLevel = "check" | "warning" | "blocker";

export type PreflightFinding = {
  level: PreflightLevel;
  message: string;
};

export type ProjectPreflight = {
  findings: PreflightFinding[];
  entryCount: number;
  hasBlockers: boolean;
};

const BLOCKED_PARTS = new Set(["node_modules", ".git", "build", "dist", ".gradle", ".idea"]);

function hasFile(entries: string[], expression: RegExp) {
  return entries.some((entry) => expression.test(entry));
}

/** Analyse locale, limitée aux noms des fichiers ZIP : aucun code n’est envoyé à cette étape. */
export function analyzeProjectEntries(projectType: ProjectType, entryNames: string[]): ProjectPreflight {
  const entries = entryNames.map((entry) => entry.replace(/\\/g, "/").replace(/^\.\//, "")).filter(Boolean);
  const findings: PreflightFinding[] = [];

  if (entries.length === 0) {
    findings.push({ level: "blocker", message: "Le ZIP ne contient aucun fichier exploitable." });
    return { findings, entryCount: 0, hasBlockers: true };
  }

  const unsafeEntry = entries.find((entry) => entry.startsWith("/") || entry.split("/").includes(".."));
  if (unsafeEntry) findings.push({ level: "blocker", message: "Le ZIP contient un chemin de fichier non autorisé." });

  const blockedEntry = entries.find((entry) => entry.split("/").some((part) => BLOCKED_PARTS.has(part)));
  if (blockedEntry) findings.push({ level: "blocker", message: `Retirez « ${blockedEntry.split("/").find((part) => BLOCKED_PARTS.has(part))} » du ZIP avant l’envoi.` });

  if (projectType === "html") {
    if (hasFile(entries, /(^|\/)index\.html$/i)) {
      findings.push({ level: "check", message: "index.html est bien présent : l’écran de départ a été trouvé." });
    } else {
      findings.push({ level: "blocker", message: "Ajoutez un fichier index.html à votre ZIP HTML." });
    }
  }

  if (projectType === "expo") {
    if (hasFile(entries, /(^|\/)package\.json$/i)) {
      findings.push({ level: "check", message: "package.json est présent : le projet Expo peut installer ses dépendances." });
    } else {
      findings.push({ level: "blocker", message: "Ajoutez package.json à votre projet Expo." });
    }
    if (!hasFile(entries, /(^|\/)(App\.(js|jsx|ts|tsx)|app\/)/i)) {
      findings.push({ level: "warning", message: "Aucun écran App ou dossier app n’a été trouvé. Vérifiez le point de départ du projet." });
    }
  }

  if (projectType === "android") {
    if (hasFile(entries, /(^|\/)settings\.gradle(\.kts)?$/i)) {
      findings.push({ level: "check", message: "settings.gradle est présent : le projet Android a été reconnu." });
    } else {
      findings.push({ level: "blocker", message: "Ajoutez settings.gradle ou settings.gradle.kts au projet Android." });
    }
    if (!hasFile(entries, /(^|\/)app\//i)) {
      findings.push({ level: "blocker", message: "Ajoutez le dossier app/ de votre projet Android." });
    }
    if (!hasFile(entries, /(^|\/)gradlew$/i)) {
      findings.push({ level: "blocker", message: "Ajoutez le fichier gradlew à votre projet Android." });
    }
  }

  if (findings.every((finding) => finding.level !== "blocker" && finding.level !== "check")) {
    findings.unshift({ level: "check", message: "La structure du projet semble prête à être envoyée." });
  }

  return { findings, entryCount: entries.length, hasBlockers: findings.some((finding) => finding.level === "blocker") };
}
