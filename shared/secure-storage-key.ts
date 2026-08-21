/**
 * Expo SecureStore sur Android refuse les caractères de séparation tels que `:`.
 * Les identifiants de build sont normalisés afin que la clé soit toujours lisible
 * lors de l’export privé du ZIP de signature.
 */
export function getKeyBackupStorageKey(buildId: string) {
  const safeBuildId = buildId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `mia_key_backup_url_${safeBuildId}`;
}
