export type MiaAgentActionKind =
  | "review-latest-code"
  | "prepare-html-apk"
  | "use-logo-as-icon"
  | "copy-latest-code"
  | "preview-latest-code"
  | "start-html-project";

export type MiaAgentAction = {
  id: string;
  kind: MiaAgentActionKind;
  title: string;
  detail: string;
  dataLabel: string;
  consequence: string;
};

export type MiaAgentActionContext = {
  hasLatestCode: boolean;
  isHtmlProject: boolean;
  hasLogo: boolean;
};

const ACTION_COPY: Record<MiaAgentActionKind, Omit<MiaAgentAction, "id">> = {
  "review-latest-code": {
    kind: "review-latest-code",
    title: "Vérifier et corriger le dernier code",
    detail: "MIA analyse le dernier code généré, explique les blocages probables et peut proposer un fichier corrigé.",
    dataLabel: "Le dernier fichier de code affiché dans cette discussion",
    consequence: "Un diagnostic et, si possible, une correction à relire seront ajoutés à l’écran. Aucun code n’est remplacé et aucune compilation ne démarre.",
  },
  "prepare-html-apk": {
    kind: "prepare-html-apk",
    title: "Préparer l’APK HTML",
    detail: "MIA place le dernier code HTML dans le formulaire de compilation.",
    dataLabel: "Le dernier fichier index.html affiché dans cette discussion",
    consequence: "Le formulaire de compilation s’ouvrira. Vous déciderez ensuite si vous lancez l’APK.",
  },
  "use-logo-as-icon": {
    kind: "use-logo-as-icon",
    title: "Utiliser le logo comme icône",
    detail: "MIA enregistre le dernier logo créé comme icône proposée pour votre APK.",
    dataLabel: "Le dernier logo créé dans MIA",
    consequence: "Le formulaire de compilation utilisera cette icône. Aucune compilation ne démarre.",
  },
  "copy-latest-code": {
    kind: "copy-latest-code",
    title: "Copier le dernier code",
    detail: "MIA copie le dernier code généré dans le presse-papiers de votre téléphone.",
    dataLabel: "Le dernier fichier de code affiché dans cette discussion",
    consequence: "Le code pourra être collé dans une autre application. Aucune donnée n’est envoyée.",
  },
  "preview-latest-code": {
    kind: "preview-latest-code",
    title: "Relire le dernier code",
    detail: "MIA ouvre l’aperçu ligne par ligne du dernier code généré.",
    dataLabel: "Le dernier fichier de code affiché dans cette discussion",
    consequence: "Un aperçu de lecture s’ouvrira. Le code ne sera ni modifié ni envoyé.",
  },
  "start-html-project": {
    kind: "start-html-project",
    title: "Nouvelle discussion HTML",
    detail: "MIA ouvre une nouvelle discussion réglée pour créer un projet HTML.",
    dataLabel: "Aucun fichier ni aucune donnée de la discussion actuelle",
    consequence: "La discussion actuelle reste dans l’historique et une nouvelle conversation vide s’ouvrira.",
  },
};

export function getMiaAgentActionDetails(kind: MiaAgentActionKind) {
  return ACTION_COPY[kind];
}

/** Returns only actions that can be completed with the data currently on screen. */
export function isMiaAgentActionAvailable(kind: MiaAgentActionKind, context: MiaAgentActionContext) {
  if (kind === "start-html-project") return true;
  if (kind === "use-logo-as-icon") return context.hasLogo;
  if (kind === "prepare-html-apk") return context.hasLatestCode && context.isHtmlProject;
  return context.hasLatestCode;
}

export function createMiaAgentAction(kind: MiaAgentActionKind): MiaAgentAction {
  return {
    id: `mia-agent-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...getMiaAgentActionDetails(kind),
  };
}

export function requiresAgentConfirmation(action: MiaAgentAction | null | undefined) {
  return Boolean(action?.id && action.title && action.consequence);
}
