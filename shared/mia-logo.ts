export const MIA_LOGO_NAME_LIMIT = 48;
export const MIA_LOGO_DESCRIPTION_LIMIT = 600;
export const MIA_LOGO_BASE64_LIMIT = 2_500_000;

export type MiaLogoRequest = {
  appName: string;
  description: string;
  primaryColor?: string;
  secondaryColor?: string;
};

export type MiaLogoResponse = {
  imageBase64: string;
  mimeType: "image/jpeg" | "image/png";
  promptSummary: string;
};

export type MiaLogoDraft = {
  id: string;
  appName: string;
  description: string;
  uri: string;
  name: string;
  size?: number;
  createdAt: string;
};

function readText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function readColor(value: unknown) {
  const color = readText(value, 7);
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toUpperCase() : undefined;
}

export function normalizeMiaLogoRequest(value: MiaLogoRequest): MiaLogoRequest | null {
  const appName = readText(value.appName, MIA_LOGO_NAME_LIMIT);
  const description = readText(value.description, MIA_LOGO_DESCRIPTION_LIMIT);
  if (!appName || !description) return null;
  return {
    appName,
    description,
    primaryColor: readColor(value.primaryColor),
    secondaryColor: readColor(value.secondaryColor),
  };
}

export function readMiaLogoResponse(text: string): MiaLogoResponse | null {
  try {
    const payload = JSON.parse(text) as Partial<MiaLogoResponse>;
    const imageBase64 = readText(payload.imageBase64, MIA_LOGO_BASE64_LIMIT);
    const mimeType = payload.mimeType === "image/png" ? "image/png" : payload.mimeType === "image/jpeg" ? "image/jpeg" : null;
    const promptSummary = readText(payload.promptSummary, 240);
    if (!imageBase64 || !mimeType || !promptSummary || !/^[A-Za-z0-9+/=]+$/.test(imageBase64)) return null;
    return { imageBase64, mimeType, promptSummary };
  } catch {
    return null;
  }
}

export function readMiaLogoDraft(value: unknown): MiaLogoDraft | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<MiaLogoDraft>;
  const appName = readText(candidate.appName, MIA_LOGO_NAME_LIMIT);
  const description = readText(candidate.description, MIA_LOGO_DESCRIPTION_LIMIT);
  const uri = readText(candidate.uri, 2_000);
  const name = readText(candidate.name, 100);
  const createdAt = readText(candidate.createdAt, 40);
  if (!appName || !description || !uri || !name || Number.isNaN(Date.parse(createdAt))) return null;
  return {
    id: readText(candidate.id, 100) || `mia-logo-${Date.now()}`,
    appName,
    description,
    uri,
    name,
    size: typeof candidate.size === "number" && Number.isFinite(candidate.size) && candidate.size > 0 ? candidate.size : undefined,
    createdAt,
  };
}
