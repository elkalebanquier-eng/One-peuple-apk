import type { ProjectType } from "@/lib/build-store";

export type BuildErrorHelp = {
  title: string;
  summary: string;
  nextStep: string;
  miaPrompt: string;
};

/** Transforme un message technique de compilation en premier geste compréhensible, sans inventer la cause exacte. */
export function getBuildErrorHelp(input: { projectName: string; projectType: ProjectType; message?: string }): BuildErrorHelp {
  const message = input.message?.trim() || "La compilation s’est arrêtée sans explication complète.";
  const normalized = message.toLocaleLowerCase("fr-FR");
  const typeLabel = input.projectType === "expo" ? "Expo/React Native" : input.projectType === "android" ? "Android natif" : "HTML";

  if (normalized.includes("introuvable") || normalized.includes("n’est plus disponible") || normalized.includes("n'est plus disponible")) {
    return {
      title: "Cette demande a expiré",
      summary: "Le fichier est encore enregistré sur votre téléphone, mais la demande précédente n’est plus disponible sur le service de compilation.",
      nextStep: "Appuyez sur Relancer : vous n’avez pas besoin de choisir le fichier une seconde fois.",
      miaPrompt: `Ma compilation ${typeLabel} « ${input.projectName} » a expiré. Explique-moi comment la relancer proprement sans changer mon code. Message : ${message}`,
    };
  }

  if (normalized.includes("limite") || normalized.includes("quota") || normalized.includes("too many") || normalized.includes("429")) {
    return {
      title: "La limite de compilations est atteinte",
      summary: "MIA💻 a atteint le nombre de compilations autorisées pour le moment. Votre fichier reste enregistré sur ce téléphone.",
      nextStep: "Attendez le prochain créneau indiqué, puis appuyez sur Relancer. Vous ne perdrez pas votre projet.",
      miaPrompt: `Ma compilation ${typeLabel} « ${input.projectName} » a atteint une limite. Message : ${message}\nExplique-moi quand je pourrai relancer sans modifier mon projet.`,
    };
  }

  if (normalized.includes("connexion") || normalized.includes("network") || normalized.includes("fetch") || normalized.includes("timeout") || normalized.includes("timed out") || normalized.includes("interrompu") || normalized.includes("indisponible") || normalized.includes("503") || normalized.includes("502")) {
    return {
      title: "La connexion au moteur a été interrompue",
      summary: "MIA💻 n’a pas pu joindre le service de compilation ou le service répondait trop lentement. Votre projet est toujours sur ce téléphone.",
      nextStep: "Vérifiez Internet, attendez un instant, puis appuyez sur Relancer. Ne choisissez pas le fichier une seconde fois.",
      miaPrompt: `Ma compilation ${typeLabel} « ${input.projectName} » n’a pas pu joindre le moteur. Message : ${message}\nIndique-moi les vérifications simples à faire avant de relancer.`,
    };
  }

  if (normalized.includes("zip") || normalized.includes("archive") || normalized.includes("trop grand") || normalized.includes("taille")) {
    return {
      title: "Le fichier du projet doit être vérifié",
      summary: "Le fichier envoyé n’a pas le format attendu, est incomplet ou dépasse la taille acceptée.",
      nextStep: "Vérifiez que vous avez choisi le bon ZIP, retirez les fichiers inutiles, puis importez-le à nouveau.",
      miaPrompt: `Le fichier de mon projet ${typeLabel} « ${input.projectName} » a été refusé. Message : ${message}\nExplique-moi simplement quel fichier préparer avant un nouvel envoi.`,
    };
  }

  if (normalized.includes("package.json") || normalized.includes("dependency") || normalized.includes("module")) {
    return {
      title: "Les fichiers Expo à vérifier",
      summary: "Le compilateur n’a probablement pas trouvé le fichier package.json ou une dépendance nécessaire.",
      nextStep: "Vérifiez que package.json est bien dans le ZIP et que le nom du module indiqué dans l’erreur est installé.",
      miaPrompt: `Ma compilation ${typeLabel} « ${input.projectName} » indique un problème de package.json ou de dépendance. Voici le message : ${message}\nExplique-moi simplement ce que je dois vérifier et donne-moi une correction sans inventer de fichier absent.`,
    };
  }

  if (normalized.includes("gradle") || normalized.includes("settings.gradle") || normalized.includes("app/")) {
    return {
      title: "La structure Android est incomplète",
      summary: "Le compilateur attend un projet Android complet avec ses fichiers Gradle et son dossier app.",
      nextStep: "Vérifiez settings.gradle, gradlew et le dossier app/, puis relancez le même ZIP.",
      miaPrompt: `Ma compilation Android native « ${input.projectName} » s’est arrêtée sur Gradle. Message : ${message}\nExplique-moi les fichiers à vérifier, dans l’ordre, et propose une correction simple.`,
    };
  }

  if (normalized.includes("keystore") || normalized.includes("sign") || normalized.includes("signature")) {
    return {
      title: "La signature de l’APK doit être vérifiée",
      summary: "Le moteur n’a pas pu terminer la préparation de l’APK signée. Votre code n’est pas forcément en cause.",
      nextStep: "Relancez une fois. Si le problème revient, demandez à MIA d’expliquer le message avant de modifier le projet.",
      miaPrompt: `La signature de mon APK ${typeLabel} « ${input.projectName} » a échoué. Message : ${message}\nExplique-moi ce qui doit être vérifié, sans me demander de partager une clé ou un mot de passe.`,
    };
  }

  if (normalized.includes("index.html") || normalized.includes("html")) {
    return {
      title: "Le fichier HTML de départ manque",
      summary: "Le projet HTML doit contenir un fichier index.html accessible dans le ZIP.",
      nextStep: "Ajoutez index.html à la racine du ZIP, ou importez directement ce fichier depuis votre téléphone.",
      miaPrompt: `Ma compilation HTML « ${input.projectName} » s’est arrêtée. Message : ${message}\nExplique-moi comment vérifier index.html et les fichiers liés avant de relancer.`,
    };
  }

  return {
    title: "Une vérification est nécessaire",
    summary: "La compilation s’est arrêtée. MIA💻 peut expliquer le problème avec des mots simples avant une nouvelle tentative.",
    nextStep: "Demandez une explication à MIA, puis relancez seulement après avoir corrigé la piste indiquée.",
    miaPrompt: `Ma compilation ${typeLabel} « ${input.projectName} » a échoué. Message : ${message}\nExplique-moi ce problème avec des mots simples, indique ce que je dois vérifier en premier et propose une correction prudente.`,
  };
}
