import type { DocumentPickerAsset } from "expo-document-picker";
import { File, Paths } from "expo-file-system";

import { createSingleFileZip } from "./html-zip";
import { MAX_SOURCE_SIZE } from "./project-import";

export type PreparedHtmlSource = {
  name: string;
  size: number;
  uri: string;
  preparedFromHtml: boolean;
};

/**
 * Creates a private temporary ZIP for a direct .html selection. Files with
 * local CSS, images or JavaScript should still be selected as a normal ZIP.
 */
export async function prepareDirectHtmlSource(asset: DocumentPickerAsset): Promise<PreparedHtmlSource> {
  if ((asset.size ?? 0) > MAX_SOURCE_SIZE - 1024) {
    throw new Error("Le fichier HTML dépasse la taille maximale de 50 Mo.");
  }

  const source = new File(asset.uri);
  const html = await source.bytes();
  if (html.length === 0) {
    throw new Error("Le fichier HTML est vide.");
  }

  const archive = createSingleFileZip("index.html", html);
  if (archive.length > MAX_SOURCE_SIZE) {
    throw new Error("Le fichier HTML dépasse la taille maximale de 50 Mo.");
  }

  const target = new File(Paths.cache, `one-app-index-${Date.now()}.zip`);
  target.create({ intermediates: true, overwrite: true });
  target.write(archive);
  return {
    name: "index.html.zip",
    size: archive.length,
    uri: target.uri,
    preparedFromHtml: true,
  };
}
