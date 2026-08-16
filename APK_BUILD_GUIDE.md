# Guide APK KIKO

## Objectif

KIKO est compilée comme une application Android native React Native/Expo. Il n’y a pas de WebView et cette version ne dépend pas d’une base de données distante. Les publications sont stockées localement sur le téléphone.

## Méthode recommandée depuis un téléphone

Le dépôt est disponible sur [GitHub](https://github.com/elkalebanquier-eng/One-peuple-apk). Le workflow `.github/workflows/build-debug-apk.yml` génère un APK debug avec un runner GitHub Actions.

Depuis l’application GitHub ou le navigateur mobile :

1. Ouvrir `elkalebanquier-eng/One-peuple-apk`.
2. Ouvrir **Actions**.
3. Choisir **Build KIKO Android APK**.
4. Appuyer sur **Run workflow**, sélectionner `main`, puis confirmer.
5. Attendre la fin du job **Build debug APK**.
6. Dans l’exécution verte, ouvrir **Artifacts** et télécharger `kiko-debug-apk`.
7. Décompresser le fichier téléchargé et ouvrir `app-debug.apk`.
8. Si Android bloque l’installation, autoriser temporairement l’installation depuis le navigateur ou le gestionnaire de fichiers utilisé, puis relancer l’installation.

L’APK ne doit être considéré comme prêt que si le job est vert et que `app-debug.apk` est présent dans l’artefact. Un fichier ZIP de code source n’est pas un APK.

## Compilation locale sur ordinateur

Une machine locale doit disposer de Node.js 22, pnpm 9, Java 17, du SDK Android, de Platform 36, de Build Tools 36 et du NDK Expo. Les commandes sont :

```bash
pnpm install --frozen-lockfile
pnpm check
npx expo prebuild --platform android --no-install
cd android
./gradlew assembleDebug --no-daemon
```

Le résultat attendu est :

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Fonctionnement hors ligne

`lib/local-store.ts` initialise des données d’exemple dans `AsyncStorage`, puis conserve les nouvelles publications dans le même stockage. `expo-file-system` copie les fichiers sélectionnés dans le répertoire privé `kiko-media/`. Les écrans Home, Buzz et Opportunités lisent ces données locales.

Les médias ne sont pas envoyés vers Firebase, Cloudinary ou ImageKit. Il n’y a donc pas de synchronisation entre utilisateurs ou entre appareils. Les vidéos sont conservées sans transcodage serveur et peuvent prendre une place importante.

## Configuration Android

Le package Android est défini dans `app.config.ts`. L’application cible le portrait, Android API 24 minimum et les architectures ARMv7 et ARM64. Les modules audio, vidéo et notifications non utilisés ont été retirés afin de limiter la taille native ; `expo-image-picker` reste utilisé pour sélectionner ou prendre des photos et vidéos.

## Diagnostic

Pour contrôler le code avant le workflow :

```bash
pnpm check
npx expo config --type public --json
```

Si le workflow échoue, ouvrir le job en erreur et lire la première erreur de compilation dans les logs. Il ne faut pas distribuer un APK tant que le job n’est pas terminé avec succès.
