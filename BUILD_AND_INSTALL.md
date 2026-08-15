# KIKO — Code source et APK debug

## Contenu du projet

KIKO est une application mobile native basée sur Expo SDK 54, React Native, Expo Router, Firebase Realtime Database, Cloudinary et ImageKit. Le projet n’utilise pas de WebView. Le dossier `android/` est généré par Expo Prebuild lorsque cela est nécessaire ; le workflow GitHub le recrée automatiquement afin d’éviter de versionner des fichiers natifs générés.

## Préparer le projet

```bash
pnpm install
pnpm check
pnpm android:prebuild
```

## Générer l’APK debug sur une machine Android complète

Il faut Node.js 22, pnpm 9, Java 17, le SDK Android, les Platform Tools, Android SDK Platform 36, Build Tools 36 et le NDK demandé par Expo. Ensuite :

```bash
export JAVA_HOME=/chemin/vers/jdk-17
export ANDROID_HOME=/chemin/vers/android-sdk
pnpm android:debug
```

Le fichier généré se trouve ici :

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Pour l’installer avec un téléphone connecté en USB et le débogage USB activé :

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Pour une installation manuelle, copiez le fichier APK sur le téléphone, autorisez l’installation depuis cette source lorsque Android le demande, puis ouvrez le fichier.

## Génération automatique avec GitHub Actions

Le workflow `.github/workflows/build-debug-apk.yml` se déclenche lors d’un push sur `main` ou manuellement depuis l’onglet **Actions** de GitHub. Il installe les dépendances, vérifie TypeScript, génère le projet Android, compile `app-debug.apk` et publie l’APK comme artefact téléchargeable pendant 14 jours.

## Données et secrets

Les clés et endpoints Firebase, Cloudinary et ImageKit doivent être vérifiés avant une utilisation en production. Les secrets GitHub ne doivent pas être ajoutés dans le dépôt. Si le service ImageKit utilise une authentification serveur, l’endpoint doit être un endpoint réel appartenant à votre backend ; une URL d’exemple ne permettra pas l’upload.

## État de la génération dans le sandbox

Le projet source et la configuration de build sont prêts. La compilation locale a été lancée, mais elle a été interrompue après plus de quinze minutes pendant `mergeExtDexDebug` en raison des limites de ressources du sandbox. Le workflow GitHub est prévu pour effectuer la compilation sur une machine de build dédiée, plus adaptée à cette étape.
