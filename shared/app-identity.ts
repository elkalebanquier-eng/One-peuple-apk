export const DEFAULT_APP_VERSION = "1.0.0";
export const DEFAULT_APP_PACKAGE = "com.oneapp.generated";

export type ValidAppIdentity = {
  valid: true;
  packageName: string;
  appVersion: string;
  versionCode: number;
};

export type InvalidAppIdentity = {
  valid: false;
  message: string;
};

export type AppIdentity = ValidAppIdentity | InvalidAppIdentity;

export function getGeneratedPackageName(buildId?: string) {
  const suffix = (buildId ?? "app")
    .replace(/^build-/i, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase()
    .slice(-24) || "app";
  return `${DEFAULT_APP_PACKAGE}.${suffix}`;
}

export function getProjectPackageName(projectName: string) {
  const suffix = projectName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 32) || "app";
  return `com.oneapp.${/^[a-z]/.test(suffix) ? suffix : `app${suffix}`}`;
}

/** Valide les deux valeurs Android visibles par l’utilisateur avant leur envoi au worker. */
export function readAppIdentity(packageName: string, appVersion: string): AppIdentity {
  const normalizedPackage = packageName.trim();
  const normalizedVersion = appVersion.trim();
  const parts = normalizedPackage.split(".");

  if (
    normalizedPackage.length < 3
    || normalizedPackage.length > 150
    || parts.length < 2
    || !parts.every((part) => /^[a-z][a-z0-9_]*$/.test(part))
  ) {
    return {
      valid: false,
      message: "Le nom du package doit ressembler à com.monnom.monapp, avec des minuscules, chiffres ou _ uniquement.",
    };
  }

  const versionMatch = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([0-9A-Za-z.-]+))?$/.exec(normalizedVersion);
  if (!versionMatch || normalizedVersion.length > 40) {
    return { valid: false, message: "La version doit ressembler à 1.0.0." };
  }

  const major = Number(versionMatch[1]);
  const minor = Number(versionMatch[2] ?? "0");
  const patch = Number(versionMatch[3] ?? "0");
  if (!Number.isSafeInteger(major) || !Number.isSafeInteger(minor) || !Number.isSafeInteger(patch) || major > 200_000 || minor > 99 || patch > 99) {
    return { valid: false, message: "La version est trop grande. Utilisez par exemple 1.0.0." };
  }

  const versionCode = Math.max(1, major * 10_000 + minor * 100 + patch);
  return { valid: true, packageName: normalizedPackage, appVersion: normalizedVersion, versionCode };
}
