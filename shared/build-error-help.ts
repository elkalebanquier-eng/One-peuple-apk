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
    summary: "La compilation s’est arrêtée. Le message ci-dessous contient la piste principale à corriger.",
    nextStep: "Relisez le message, puis demandez à MIA une explication adaptée à votre projet avant de relancer.",
    miaPrompt: `Ma compilation ${typeLabel} « ${input.projectName} » a échoué. Message : ${message}\nExplique-moi ce problème avec des mots simples, indique ce que je dois vérifier en premier et propose une correction prudente.`,
  };
}
