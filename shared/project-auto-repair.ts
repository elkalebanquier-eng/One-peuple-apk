import type { ProjectPreflight } from "./project-preflight";

const REPAIRABLE_FOLDERS = new Set(["node_modules", ".git", "build", "dist", ".gradle", ".idea"]);

export type SafeArchiveRepairProposal = {
  folders: string[];
  summary: string;
};

export function isSafeArchiveRepairFolder(folder: string) {
  return REPAIRABLE_FOLDERS.has(folder);
}

/** Ne propose que le retrait de dossiers générés ; aucun fichier de code n’est modifié. */
export function getSafeArchiveRepairProposal(input: { preflight: ProjectPreflight; preparedFromHtml?: boolean }): SafeArchiveRepairProposal | null {
  if (input.preparedFromHtml) return null;
  const folders = Array.from(new Set(
    input.preflight.findings
      .filter((finding) => finding.level === "blocker")
      .flatMap((finding) => Array.from(finding.message.matchAll(/Retirez « ([^»]+) »/g)).map((match) => match[1]))
      .filter((folder): folder is string => Boolean(folder && isSafeArchiveRepairFolder(folder))),
  ));
  if (!folders.length) return null;
  return { folders, summary: `MIA peut créer une copie sans ${folders.map((folder) => `« ${folder} »`).join(" et ")}. Votre ZIP original reste inchangé.` };
}
