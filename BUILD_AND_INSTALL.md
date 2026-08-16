# KIKO — Code source et APK debug

## État de l’application

KIKO est une application mobile native basée sur **Expo SDK 54**, **React Native** et **Expo Router**. Elle n’utilise pas de WebView. Dans cette version, il n’y a pas de base de données distante : les posts et opportunités sont conservés dans `AsyncStorage`, tandis que les photos et vidéos publiées sont copiées dans le stockage privé de l’application avec `expo-file-system`.

L’interface existante n’a pas été refaite. Les écrans Home, Buzz, Opportunités, Profil, Paramètres et Création conservent leur présentation et leur navigation. Firebase, Cloudinary et ImageKit ont été retirés du code actif.

## Vérifications locales sans Android SDK

```bash
pnpm install --frozen-lockfile
pnpm check
npx expo config --type public --json
npx expo prebuild --platform android --no-install
```

La commande `pnpm check` doit se terminer sans erreur. La commande Expo doit afficher le nom `KIKO`, le package Android configuré et les plugins natifs. Le prébuild ne produit pas encore l’APK ; il génère le projet Android.

## Compilation APK sur une machine Android complète

Une compilation Gradle locale nécessite Java 17, le SDK Android, Android Platform 36, Build Tools 36 et le NDK demandé par Expo. Après installation de ces composants :

```bash
export JAVA_HOME=/chemin/vers/jdk-17
export ANDROID_HOME=/chemin/vers/android-sdk
pnpm install --frozen-lockfile
pnpm check
pnpm android:prebuild
pnpm android:debug
```

Le fichier attendu est :

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Une présence de ce fichier ne suffit pas à elle seule : il faut vérifier que sa taille est non nulle et, si possible, l’installer sur un appareil Android avec :

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## Génération depuis un téléphone avec GitHub Actions

Le dépôt public configuré est [One-peuple-apk](https://github.com/elkalebanquier-eng/One-peuple-apk). Le fichier `.github/workflows/build-debug-apk.yml` lance automatiquement :

1. l’installation verrouillée des dépendances ;
2. la vérification TypeScript ;
3. le prébuild Android ;
4. `./gradlew assembleDebug` ;
5. la publication de `app-debug.apk` comme artefact GitHub pendant 14 jours.

Depuis un téléphone :

1. Ouvrir le dépôt GitHub, puis l’onglet **Actions**.
2. Sélectionner **Build KIKO Android APK**.
3. Appuyer sur **Run workflow**, choisir `main`, puis confirmer.
4. Attendre que le job affiche une coche verte **Build debug APK**.
5. Ouvrir l’exécution terminée, descendre jusqu’à **Artifacts**, puis télécharger `kiko-debug-apk`.
6. Décompresser l’archive et ouvrir `app-debug.apk` sur le téléphone.

Le workflow doit être vert avant de considérer l’APK comme réellement compilé. Si le job échoue, le message d’erreur dans **Build debug APK** doit être corrigé avant toute livraison.

## Fonctionnement du stockage local

Les données de démonstration sont initialisées localement au premier lancement. Une publication créée depuis l’onglet de création est enregistrée dans `AsyncStorage`. Le fichier média est copié sous le répertoire privé `kiko-media/` de l’application. Cela signifie que les données ne sont pas synchronisées entre téléphones et qu’une désinstallation de l’application peut les supprimer.

## Compatibilité et limites connues

La configuration Android cible le portrait, Android API 24 minimum et les architectures ARMv7 et ARM64. Les vidéos sont conservées localement sans transcodage serveur ; une vidéo volumineuse peut donc occuper beaucoup d’espace. La lecture vidéo avancée et la synchronisation entre appareils ne font pas partie de cette version locale.

## État de la compilation dans le sandbox

Le TypeScript, la résolution de configuration Expo et le prébuild Android ont été vérifiés. La compilation Gradle locale ne peut pas être exécutée dans le sandbox actuel car aucun SDK Android (`ANDROID_HOME`) n’y est installé. Le workflow GitHub Actions est prévu pour effectuer la compilation réelle sur un runner Android complet ; son résultat doit être contrôlé avant de présenter l’APK comme installable.
