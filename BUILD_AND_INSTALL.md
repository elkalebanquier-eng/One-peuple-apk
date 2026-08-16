# One App — code source et APK de test

## Objectif

**One App** est une application Android native qui guide une personne dans l’import d’un projet ZIP, le choix de son type — Expo / React Native, Android natif ou HTML — puis la demande d’une **APK de test**. L’interface ne montre ni Metro, ni Gradle, ni GitHub.

> Le ZIP reste dans l’espace privé de l’application jusqu’à l’envoi vers le service de compilation interne. Un véritable service de compilation isolé reste nécessaire pour construire les ZIP d’utilisateurs.

## Vérifications du code

Depuis la racine du projet :

```bash
pnpm check
pnpm lint
pnpm test
npx expo config --type public
```

Ces commandes vérifient TypeScript, le lint, les tests d’import et la configuration Android de **One App**.

## Compiler l’APK autonome de One App

Le workflow interne `.github/workflows/build-debug-apk.yml` produit une APK de test autonome. Il exécute un build Android **release signé avec la clé de test**, ce qui embarque le bundle JavaScript et ne nécessite pas Metro ni `localhost:8081`.

Une fois l’exécution terminée, l’artefact à télécharger s’appelle `one-app-test-apk` et le fichier est `one-app-test.apk`.

## Installation sur Android

1. Télécharger `one-app-test.apk` depuis le résultat de build.
2. Ouvrir le fichier téléchargé depuis le téléphone.
3. Si Android le demande, autoriser temporairement l’installation depuis le navigateur ou le gestionnaire de fichiers utilisé.
4. Ouvrir **One App**. L’écran d’accueil doit afficher les builds et ne doit jamais afficher l’écran rouge Metro.

## Limites actuelles

L’interface, le choix du type, l’import ZIP et la validation locale sont prêts. La compilation de ZIP provenant de plusieurs utilisateurs nécessite un exécuteur isolé côté One App ; cette étape ne doit jamais être réalisée directement sur le téléphone.
