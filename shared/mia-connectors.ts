export type MiaConnectorState = "planned" | "protected" | "internal" | "disabled";

export type MiaConnector = {
  id: "github" | "browser" | "cloudflare" | "gemini";
  title: string;
  state: MiaConnectorState;
  status: string;
  detail: string;
};

/**
 * États affichés dans MIA. Ils ne représentent pas une authentification :
 * l’application ne stocke aucun mot de passe, cookie ni jeton personnel.
 */
export const MIA_CONNECTORS: MiaConnector[] = [
  {
    id: "github",
    title: "GitHub",
    state: "planned",
    status: "À préparer",
    detail: "Une future autorisation officielle permettra de choisir vos dépôts, sans jeton dans l’APK.",
  },
  {
    id: "browser",
    title: "Navigateur",
    state: "protected",
    status: "Protégé",
    detail: "MIA peut ouvrir une page officielle, mais ne lit jamais vos sessions, mots de passe ou onglets existants.",
  },
  {
    id: "cloudflare",
    title: "Cloudflare",
    state: "internal",
    status: "Service MIA",
    detail: "Le relais personnel de MIA prépare les demandes sans connecter votre compte Cloudflare dans l’application.",
  },
  {
    id: "gemini",
    title: "Google Gemini · KIA",
    state: "disabled",
    status: "Désactivé",
    detail: "KIA reste désactivée tant qu’un secret sécurisé n’est pas configuré hors de l’APK.",
  },
];

export function connectorStateLabel(state: MiaConnectorState) {
  if (state === "planned") return "À préparer";
  if (state === "protected") return "Protégé";
  if (state === "internal") return "Service MIA";
  return "Désactivé";
}
