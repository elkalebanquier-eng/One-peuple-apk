function crc32(bytes: Uint8Array) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
    }
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

/** Creates a standard, uncompressed ZIP containing exactly one file. */
export function createSingleFileZip(fileName: string, contents: Uint8Array) {
  const name = new TextEncoder().encode(fileName);
  const checksum = crc32(contents);
  const localHeaderLength = 30 + name.length;
  const centralHeaderLength = 46 + name.length;
  const output = new Uint8Array(localHeaderLength + contents.length + centralHeaderLength + 22);

  writeUint32(output, 0, 0x04034b50);
  writeUint16(output, 4, 20);
  writeUint16(output, 6, 0);
  writeUint16(output, 8, 0);
  writeUint16(output, 10, 0);
  writeUint16(output, 12, 0);
  writeUint32(output, 14, checksum);
  writeUint32(output, 18, contents.length);
  writeUint32(output, 22, contents.length);
  writeUint16(output, 26, name.length);
  writeUint16(output, 28, 0);
  output.set(name, 30);
  output.set(contents, localHeaderLength);

  const centralOffset = localHeaderLength + contents.length;
  writeUint32(output, centralOffset, 0x02014b50);
  writeUint16(output, centralOffset + 4, 20);
  writeUint16(output, centralOffset + 6, 20);
  writeUint16(output, centralOffset + 8, 0);
  writeUint16(output, centralOffset + 10, 0);
  writeUint16(output, centralOffset + 12, 0);
  writeUint16(output, centralOffset + 14, 0);
  writeUint32(output, centralOffset + 16, checksum);
  writeUint32(output, centralOffset + 20, contents.length);
  writeUint32(output, centralOffset + 24, contents.length);
  writeUint16(output, centralOffset + 28, name.length);
  writeUint16(output, centralOffset + 30, 0);
  writeUint16(output, centralOffset + 32, 0);
  writeUint16(output, centralOffset + 34, 0);
  writeUint16(output, centralOffset + 36, 0);
  writeUint32(output, centralOffset + 38, 0);
  writeUint32(output, centralOffset + 42, 0);
  output.set(name, centralOffset + 46);

  const endOffset = centralOffset + centralHeaderLength;
  writeUint32(output, endOffset, 0x06054b50);
  writeUint16(output, endOffset + 4, 0);
  writeUint16(output, endOffset + 6, 0);
  writeUint16(output, endOffset + 8, 1);
  writeUint16(output, endOffset + 10, 1);
  writeUint32(output, endOffset + 12, centralHeaderLength);
  writeUint32(output, endOffset + 16, centralOffset);
  writeUint16(output, endOffset + 20, 0);
  return output;
}
