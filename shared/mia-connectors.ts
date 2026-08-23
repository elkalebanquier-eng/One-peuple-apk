export const CONNECTOR_CATEGORIES = ["Tous", "Code", "IA", "Fichiers", "Organisation", "Publication"] as const;

export type MiaConnectorCategory = (typeof CONNECTOR_CATEGORIES)[number];
export type MiaConnectorState = "planned" | "protected" | "internal" | "disabled" | "catalog";
export type MiaConnectorId =
  | "github"
  | "browser"
  | "cloudflare"
  | "gemini"
  | "google-workspace"
  | "gmail"
  | "google-drive"
  | "google-calendar"
  | "google-photos"
  | "dropbox"
  | "onedrive"
  | "box"
  | "notion"
  | "slack"
  | "discord"
  | "trello"
  | "linear"
  | "figma"
  | "vercel"
  | "netlify"
  | "supabase"
  | "sentry"
  | "hugging-face";

export type MiaConnector = {
  id: MiaConnectorId;
  title: string;
  category: Exclude<MiaConnectorCategory, "Tous">;
  icon: string;
  state: MiaConnectorState;
  status: string;
  detail: string;
  permissions: string[];
};

/**
 * Catalogue des connecteurs proposés dans MIA. Leur présence dans cette liste
 * ne vaut jamais connexion : chaque service devient actif uniquement après son
 * autorisation officielle et la configuration de son relais sécurisé.
 */
export const MIA_CONNECTORS: MiaConnector[] = [
  { id: "github", title: "GitHub", category: "Code", icon: "code", state: "planned", status: "À configurer", detail: "Choisir des dépôts et suivre les compilations après une autorisation GitHub officielle.", permissions: ["Dépôts choisis", "État des compilations"] },
  { id: "cloudflare", title: "Cloudflare", category: "Code", icon: "cloud-queue", state: "internal", status: "Service MIA", detail: "Relais personnel déjà utilisé par MIA pour ses services, sans relier votre compte Cloudflare.", permissions: ["Aucun compte personnel relié"] },
  { id: "vercel", title: "Vercel", category: "Publication", icon: "rocket-launch", state: "catalog", status: "Catalogue", detail: "Préparer des projets pour un futur déploiement après autorisation officielle.", permissions: ["Projets choisis", "État des déploiements"] },
  { id: "netlify", title: "Netlify", category: "Publication", icon: "public", state: "catalog", status: "Catalogue", detail: "Préparer des projets web pour une future connexion officielle Netlify.", permissions: ["Sites choisis", "État des déploiements"] },
  { id: "supabase", title: "Supabase", category: "Code", icon: "storage", state: "catalog", status: "Catalogue", detail: "Relier un projet Supabase choisi lorsque son autorisation sécurisée sera disponible.", permissions: ["Projet choisi", "Configuration limitée"] },
  { id: "sentry", title: "Sentry", category: "Code", icon: "bug-report", state: "catalog", status: "Catalogue", detail: "Consulter de futurs rapports d’erreurs sélectionnés après autorisation officielle.", permissions: ["Projets choisis", "Rapports d’erreurs"] },
  { id: "gemini", title: "Google Gemini · KIA", category: "IA", icon: "auto-awesome", state: "disabled", status: "Désactivé", detail: "KIA reste désactivée tant qu’un secret sécurisé n’est pas configuré hors de l’APK.", permissions: ["Aucune autorisation active"] },
  { id: "hugging-face", title: "Hugging Face", category: "IA", icon: "psychology", state: "catalog", status: "Catalogue", detail: "Préparer l’usage de modèles choisis après une connexion officielle et limitée.", permissions: ["Modèles choisis", "Demandes limitées"] },
  { id: "google-workspace", title: "Google Workspace", category: "Organisation", icon: "workspaces", state: "catalog", status: "Catalogue", detail: "Relier des outils Google sélectionnés avec les permissions minimales nécessaires.", permissions: ["Services choisis", "Accès limité"] },
  { id: "gmail", title: "Gmail", category: "Organisation", icon: "mail", state: "catalog", status: "Catalogue", detail: "Préparer l’envoi ou la lecture de messages explicitement choisis après autorisation officielle.", permissions: ["Messages choisis", "Aucune lecture générale"] },
  { id: "google-calendar", title: "Google Agenda", category: "Organisation", icon: "calendar-month", state: "catalog", status: "Catalogue", detail: "Créer ou consulter des événements choisis après une autorisation Google limitée.", permissions: ["Agenda choisi", "Événements choisis"] },
  { id: "notion", title: "Notion", category: "Organisation", icon: "note-alt", state: "catalog", status: "Catalogue", detail: "Préparer l’accès à des pages Notion que vous aurez explicitement sélectionnées.", permissions: ["Pages choisies", "Aucun espace complet"] },
  { id: "slack", title: "Slack", category: "Organisation", icon: "forum", state: "catalog", status: "Catalogue", detail: "Préparer des messages ou canaux sélectionnés après autorisation de votre espace Slack.", permissions: ["Canaux choisis", "Messages autorisés"] },
  { id: "discord", title: "Discord", category: "Organisation", icon: "chat", state: "catalog", status: "Catalogue", detail: "Préparer l’accès à un serveur ou à des canaux que vous choisirez explicitement.", permissions: ["Serveurs choisis", "Canaux choisis"] },
  { id: "trello", title: "Trello", category: "Organisation", icon: "view-kanban", state: "catalog", status: "Catalogue", detail: "Préparer la création ou la lecture de tableaux Trello choisis après autorisation.", permissions: ["Tableaux choisis", "Cartes autorisées"] },
  { id: "linear", title: "Linear", category: "Organisation", icon: "checklist", state: "catalog", status: "Catalogue", detail: "Préparer le suivi de tâches sélectionnées dans un espace Linear autorisé.", permissions: ["Équipes choisies", "Tâches autorisées"] },
  { id: "figma", title: "Figma", category: "Fichiers", icon: "palette", state: "catalog", status: "Catalogue", detail: "Préparer l’import de fichiers Figma que vous sélectionnerez après connexion officielle.", permissions: ["Fichiers choisis", "Aucun accès général"] },
  { id: "google-drive", title: "Google Drive", category: "Fichiers", icon: "folder", state: "catalog", status: "Catalogue", detail: "Choisir des fichiers Drive à importer ou exporter après autorisation Google limitée.", permissions: ["Fichiers choisis", "Aucun accès général"] },
  { id: "google-photos", title: "Google Photos", category: "Fichiers", icon: "photo-library", state: "catalog", status: "Catalogue", detail: "Préparer l’import de photos explicitement choisies après autorisation officielle.", permissions: ["Photos choisies", "Aucun album complet"] },
  { id: "dropbox", title: "Dropbox", category: "Fichiers", icon: "inventory-2", state: "catalog", status: "Catalogue", detail: "Choisir des fichiers Dropbox à importer ou exporter dans MIA.", permissions: ["Fichiers choisis", "Aucun dossier complet"] },
  { id: "onedrive", title: "OneDrive", category: "Fichiers", icon: "cloud", state: "catalog", status: "Catalogue", detail: "Préparer une connexion Microsoft limitée aux fichiers que vous sélectionnez.", permissions: ["Fichiers choisis", "Aucun accès général"] },
  { id: "box", title: "Box", category: "Fichiers", icon: "folder-open", state: "catalog", status: "Catalogue", detail: "Préparer l’ajout de fichiers Box sélectionnés après autorisation officielle.", permissions: ["Fichiers choisis", "Aucun dossier complet"] },
  { id: "browser", title: "Navigateur", category: "Fichiers", icon: "public", state: "protected", status: "Protégé", detail: "MIA peut ouvrir une page officielle, mais ne lit jamais vos sessions, mots de passe ou onglets existants.", permissions: ["Ouverture de pages officielles", "Aucun accès aux sessions"] },
];

export function connectorStateLabel(state: MiaConnectorState) {
  if (state === "planned") return "À configurer";
  if (state === "protected") return "Protégé";
  if (state === "internal") return "Service MIA";
  if (state === "catalog") return "Catalogue";
  return "Désactivé";
}

export function filterMiaConnectors(query: string, category: MiaConnectorCategory) {
  const normalizedQuery = query.trim().toLocaleLowerCase("fr-FR");
  return MIA_CONNECTORS.filter((connector) => {
    const categoryMatches = category === "Tous" || connector.category === category;
    const queryMatches = !normalizedQuery || [connector.title, connector.category, connector.status, connector.detail]
      .join(" ")
      .toLocaleLowerCase("fr-FR")
      .includes(normalizedQuery);
    return categoryMatches && queryMatches;
  });
}
