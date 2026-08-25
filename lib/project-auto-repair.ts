import JSZip from "jszip";
import * as FileSystem from "expo-file-system/legacy";

import type { ProjectType } from "@/lib/build-store";
import { isSafeArchiveRepairFolder } from "@/shared/project-auto-repair";

export type RepairedArchive = {
  name: string;
  uri: string;
  size: number;
  removedEntries: number;
};

function entryHasRepairableFolder(name: string, folders: Set<string>) {
  return name.replace(/\\/g, "/").split("/").some((part) => folders.has(part));
}

function cleanArchiveName(name: string) {
  const stem = name.replace(/\.zip$/i, "") || "projet";
  return `${stem}-nettoye.zip`;
}

/** Crée une copie locale nettoyée. Ne corrige ni code, ni dépendance, ni permission, ni secret. */
export async function createSafeArchiveRepair(input: { uri: string; name: string; projectType: ProjectType; folders: string[] }): Promise<RepairedArchive> {
  if (!input.folders.length || input.folders.some((folder) => !isSafeArchiveRepairFolder(folder))) {
    throw new Error("Cette correction automatique n’est pas autorisée.");
  }
  const source = await FileSystem.readAsStringAsync(input.uri, { encoding: FileSystem.EncodingType.Base64 });
  const zip = await JSZip.loadAsync(source, { base64: true, createFolders: false });
  const folders = new Set(input.folders);
  const entries = Object.keys(zip.files).filter((name) => entryHasRepairableFolder(name, folders));
  if (!entries.length) throw new Error("Aucun dossier généré à retirer n’a été trouvé dans ce ZIP.");

  entries.forEach((name) => zip.remove(name));
  const directory = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? ""}one-app/repairs`;
  if (!directory) throw new Error("Le dossier temporaire est indisponible sur ce téléphone.");
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const uri = `${directory}/${Date.now()}-${input.projectType}-nettoye.zip`;
  const base64 = await zip.generateAsync({ type: "base64", compression: "DEFLATE", compressionOptions: { level: 6 } });
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  const info = await FileSystem.getInfoAsync(uri);
  return { uri, name: cleanArchiveName(input.name), size: info.exists ? info.size ?? 0 : 0, removedEntries: entries.length };
}
