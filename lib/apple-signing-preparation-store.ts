import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  EMPTY_APPLE_SIGNING_PREPARATION,
  sanitizeAppleSigningPreparation,
  type AppleSigningPreparation,
} from "@/shared/apple-signing-preparation";

const STORAGE_KEY = "one-app-apple-signing-preparation-v1";

/**
 * Ne persiste que des noms, identifiants et cases à cocher. Les secrets de
 * signature Apple ne doivent jamais transiter par MIA💻.
 */
export async function loadAppleSigningPreparation(): Promise<AppleSigningPreparation> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeAppleSigningPreparation(JSON.parse(raw) as Partial<AppleSigningPreparation>) : EMPTY_APPLE_SIGNING_PREPARATION;
  } catch {
    return EMPTY_APPLE_SIGNING_PREPARATION;
  }
}

export async function saveAppleSigningPreparation(preparation: Partial<AppleSigningPreparation>) {
  const safePreparation = sanitizeAppleSigningPreparation(preparation);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(safePreparation));
  return safePreparation;
}

export async function clearAppleSigningPreparation() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
