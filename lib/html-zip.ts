function crc32(bytes: Uint8Array) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit += 1) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function writeUint16(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

export type ZipFile = { name: string; contents: Uint8Array };

/** Crée un ZIP standard non compressé, intégralement sur le téléphone. */
export function createZip(files: ZipFile[]) {
  if (files.length === 0) throw new Error("Le ZIP doit contenir au moins un fichier.");
  if (files.length > 65_535) throw new Error("Le ZIP contient trop de fichiers.");
  const entries = files.map((file) => {
    if (!file.name || file.name.startsWith("/") || file.name.split("/").includes("..")) throw new Error("Nom de fichier ZIP non autorisé.");
    const name = new TextEncoder().encode(file.name);
    return { ...file, name, checksum: crc32(file.contents), localOffset: 0 };
  });
  const localLength = entries.reduce((total, entry) => total + 30 + entry.name.length + entry.contents.length, 0);
  const centralLength = entries.reduce((total, entry) => total + 46 + entry.name.length, 0);
  const output = new Uint8Array(localLength + centralLength + 22);
  let offset = 0;

  for (const entry of entries) {
    entry.localOffset = offset;
    writeUint32(output, offset, 0x04034b50);
    writeUint16(output, offset + 4, 20); writeUint16(output, offset + 6, 0); writeUint16(output, offset + 8, 0); writeUint16(output, offset + 10, 0); writeUint16(output, offset + 12, 0);
    writeUint32(output, offset + 14, entry.checksum); writeUint32(output, offset + 18, entry.contents.length); writeUint32(output, offset + 22, entry.contents.length);
    writeUint16(output, offset + 26, entry.name.length); writeUint16(output, offset + 28, 0);
    output.set(entry.name, offset + 30); output.set(entry.contents, offset + 30 + entry.name.length);
    offset += 30 + entry.name.length + entry.contents.length;
  }

  const centralOffset = offset;
  for (const entry of entries) {
    writeUint32(output, offset, 0x02014b50);
    writeUint16(output, offset + 4, 20); writeUint16(output, offset + 6, 20); writeUint16(output, offset + 8, 0); writeUint16(output, offset + 10, 0); writeUint16(output, offset + 12, 0); writeUint16(output, offset + 14, 0);
    writeUint32(output, offset + 16, entry.checksum); writeUint32(output, offset + 20, entry.contents.length); writeUint32(output, offset + 24, entry.contents.length);
    writeUint16(output, offset + 28, entry.name.length); writeUint16(output, offset + 30, 0); writeUint16(output, offset + 32, 0); writeUint16(output, offset + 34, 0); writeUint16(output, offset + 36, 0);
    writeUint32(output, offset + 38, 0); writeUint32(output, offset + 42, entry.localOffset); output.set(entry.name, offset + 46);
    offset += 46 + entry.name.length;
  }

  writeUint32(output, offset, 0x06054b50); writeUint16(output, offset + 4, 0); writeUint16(output, offset + 6, 0); writeUint16(output, offset + 8, entries.length); writeUint16(output, offset + 10, entries.length);
  writeUint32(output, offset + 12, centralLength); writeUint32(output, offset + 16, centralOffset); writeUint16(output, offset + 20, 0);
  return output;
}

export function createSingleFileZip(fileName: string, contents: Uint8Array) {
  return createZip([{ name: fileName, contents }]);
}
