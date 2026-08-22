import { getKiaServiceDetail } from "./kia-availability";

export type MiaRelayHealth = "checking" | "ready" | "offline";

export type MiaServiceStatus = {
  id: "build" | "relay" | "mia" | "gemini";
  title: string;
  detail: string;
  state: "active" | "ready" | "attention";
};

/**
 * Textes volontairement simples : aucun secret, jeton, dépôt ou détail de l’infrastructure
 * de compilation n’est présenté dans l’application personnelle.
 */
export function getMiaServiceStatuses(relayHealth: MiaRelayHealth): MiaServiceStatus[] {
  const relayDetail = relayHealth === "ready"
    ? "Connexion de compilation disponible."
    : relayHealth === "offline"
      ? "À vérifier : reconnectez le téléphone à Internet puis réessayez."
      : "Vérification de la connexion…";

  return [
    {
      id: "build",
      title: "Compilation APK",
      detail: relayHealth === "offline" ? "En attente de connexion." : "Prête à préparer vos APK depuis MIA💻.",
      state: relayHealth === "offline" ? "attention" : "active",
    },
    { id: "relay", title: "Connexion de compilation", detail: relayDetail, state: relayHealth === "ready" ? "active" : relayHealth === "offline" ? "attention" : "ready" },
    { id: "mia", title: "Assistant MIA", detail: "Actif pour expliquer le code et les erreurs de compilation.", state: "active" },
    { id: "gemini", title: "Assistant KIA", detail: getKiaServiceDetail(), state: "ready" },
  ];
}
