export type MiaAgentActionKind = "review-latest-code" | "prepare-html-apk" | "use-logo-as-icon";

export type MiaAgentAction = {
  id: string;
  kind: MiaAgentActionKind;
  title: string;
  detail: string;
  dataLabel: string;
  consequence: string;
};

const ACTION_COPY: Record<MiaAgentActionKind, Omit<MiaAgentAction, "id">> = {
  "review-latest-code": {
    kind: "review-latest-code",
    title: "Vérifier le dernier code",
    detail: "MIA analyse le dernier code généré pour repérer les blocages probables.",
    dataLabel: "Le dernier fichier de code affiché dans cette discussion",
    consequence: "Un diagnostic simple sera ajouté à l’écran. Aucune compilation ne démarre.",
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
};

export function createMiaAgentAction(kind: MiaAgentActionKind): MiaAgentAction {
  return {
    id: `mia-agent-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...ACTION_COPY[kind],
  };
}

export function requiresAgentConfirmation(action: MiaAgentAction | null | undefined) {
  return Boolean(action?.id && action.title && action.consequence);
}
