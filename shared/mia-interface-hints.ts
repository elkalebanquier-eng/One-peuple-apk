export const MIA_CONNECTORS_HINT_STORAGE_KEY = "one-app-mia-connectors-hint-shown-v1";

/** Affiche l’aide seulement tant qu’elle n’a pas été montrée une première fois. */
export function shouldShowMiaConnectorsHint(storedValue: string | null) {
  return storedValue !== "1";
}
