import { File } from "expo-file-system";

import { analyzeProjectEntries, type ProjectPreflight } from "@/shared/project-preflight";
import type { ProjectType } from "@/lib/build-store";

function readUint16(bytes: Uint8Array, offset: number) { return bytes[offset] | (bytes[offset + 1] << 8); }
function readUint32(bytes: Uint8Array, offset: number) { return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0; }

/** Lit uniquement les noms du répertoire central ZIP ; le contenu du code reste local. */
export function readZipEntryNames(bytes: Uint8Array) {
  let end = -1;
  for (let offset = Math.max(0, bytes.length - 65_557); offset <= bytes.length - 4; offset += 1) {
    if (readUint32(bytes, offset) === 0x06054b50) end = offset;
  }
  if (end < 0) throw new Error("Le fichier ne ressemble pas à un ZIP valide.");
  const entryCount = readUint16(bytes, end + 10);
  let offset = readUint32(bytes, end + 16);
  const decoder = new TextDecoder();
  const entries: string[] = [];
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > bytes.length || readUint32(bytes, offset) !== 0x02014b50) throw new Error("Le ZIP ne peut pas être lu correctement.");
    const nameLength = readUint16(bytes, offset + 28);
    const extraLength = readUint16(bytes, offset + 30);
    const commentLength = readUint16(bytes, offset + 32);
    entries.push(decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength)));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

export async function inspectProjectSource(input: { projectType: ProjectType; uri: string; preparedFromHtml?: boolean }) : Promise<ProjectPreflight> {
  if (input.preparedFromHtml) return analyzeProjectEntries("html", ["index.html"]);
  const bytes = await new File(input.uri).bytes();
  return analyzeProjectEntries(input.projectType, readZipEntryNames(bytes));
}
