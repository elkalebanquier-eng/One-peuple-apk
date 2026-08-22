import JSZip from "jszip";
import * as FileSystem from "expo-file-system/legacy";

import { createLocalHtmlPreview, MAX_PREVIEW_HTML_BYTES, type LocalHtmlPreview } from "@/shared/html-preview";

export { createLocalHtmlPreview, type LocalHtmlPreview } from "@/shared/html-preview";

/** Lit seulement index.html d’un ZIP local. Aucun contenu n’est envoyé au réseau. */
export async function extractLocalHtmlPreviewFromZip(uri: string): Promise<LocalHtmlPreview | null> {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const zip = await JSZip.loadAsync(base64, { base64: true, createFolders: false });
  const names = Object.keys(zip.files).filter((name) => !zip.files[name]?.dir && /(^|\/)index\.html?$/i.test(name));
  if (!names.length) return null;

  const name = names.sort((left, right) => left.length - right.length)[0];
  const file = zip.file(name);
  if (!file) return null;
  const expectedSize = (file as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize;
  if (typeof expectedSize === "number" && expectedSize > MAX_PREVIEW_HTML_BYTES) {
    throw new Error("index.html est trop grand pour un aperçu local. Vous pouvez tout de même le compiler.");
  }
  const bytes = await file.async("uint8array");
  if (bytes.byteLength > MAX_PREVIEW_HTML_BYTES) {
    throw new Error("index.html est trop grand pour un aperçu local. Vous pouvez tout de même le compiler.");
  }
  return createLocalHtmlPreview(new TextDecoder().decode(bytes), true);
}
