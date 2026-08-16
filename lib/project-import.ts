export const MAX_SOURCE_SIZE = 50 * 1024 * 1024;

export function isZipFile(fileName: string) {
  return fileName.trim().toLowerCase().endsWith(".zip");
}

export function validateProjectArchive(fileName: string, size?: number | null) {
  if (!isZipFile(fileName)) {
    return { valid: false, reason: "Archive ZIP requise" } as const;
  }
  if (size && size > MAX_SOURCE_SIZE) {
    return { valid: false, reason: "Archive trop grande" } as const;
  }
  return { valid: true, reason: null } as const;
}
