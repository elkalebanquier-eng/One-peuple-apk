# Guide de Génération APK KIKO

## 🚀 Génération APK sans Expo Publish

Cette application KIKO est configurée pour être installée directement sur Android via APK, sans dépendre du système Expo Publish.

### Prérequis

- **Node.js** et **pnpm** installés
- **EAS CLI** pour la génération cloud (recommandé)
- **Android SDK** pour la génération locale (optionnel)
- Compte Expo (gratuit)

### Option 1: Génération Cloud avec EAS (Recommandé) ☁️

La génération cloud est plus simple et ne nécessite pas d'installation locale d'Android SDK.

#### Étapes:

1. **Installer EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Se connecter à Expo:**
   ```bash
   eas login
   ```

3. **Configurer le projet (première fois):**
   ```bash
   eas build:configure
   ```

4. **Générer l'APK:**
   ```bash
   eas build --platform android
   ```

   Ou avec plus de contrôle:
   ```bash
   eas build --platform android --local=false --wait
   ```

5. **Télécharger l'APK:**
   - EAS affichera un lien pour télécharger l'APK une fois la compilation terminée
   - L'APK sera disponible pendant 30 jours

### Option 2: Génération Locale avec EAS

Si vous avez Android SDK installé localement:

```bash
eas build --platform android --local=true
```

### Option 3: Génération Manuelle avec Expo

Pour une génération complètement manuelle:

```bash
# 1. Construire le bundle
expo prebuild --clean

# 2. Générer l'APK
cd android
./gradlew assembleRelease
cd ..
```

L'APK sera dans: `android/app/build/outputs/apk/release/app-release.apk`

## 📱 Installation sur Appareil

### Via APK Direct:

1. **Télécharger l'APK** depuis le lien fourni par EAS
2. **Transférer sur l'appareil** ou télécharger directement
3. **Installer:**
   ```bash
   adb install app-release.apk
   ```
   Ou ouvrir le fichier APK sur l'appareil

### Via ADB:

```bash
# Lister les appareils connectés
adb devices

# Installer l'APK
adb install -r app-release.apk

# Lancer l'app
adb shell am start -n space.manus.kiko/space.manus.kiko.MainActivity
```

## 🔧 Configuration avant Génération

Assurez-vous que `app.config.ts` est correctement configuré:

```typescript
const env = {
  appName: "KIKO",           // Nom affiché dans le launcher
  appSlug: "kiko-native-app", // Slug unique
  logoUrl: "",               // URL du logo (optionnel)
  scheme: "manusXXXXXXXXXXXX", // Scheme unique
  iosBundleId: "space.manus.kiko.t...",
  androidPackage: "space.manus.kiko.t...",
};
```

## 📊 Intégrations Configurées

L'APK inclut:

- ✅ **Firebase Realtime Database** - Données en temps réel
- ✅ **Cloudinary** - Upload et streaming vidéo
- ✅ **ImageKit** - Optimisation images
- ✅ **React Native** - UI native performante
- ✅ **Expo SDK 54** - Accès aux APIs natives

## 🎯 Taille et Performance

- **Taille APK:** ~50-70 MB (dépend des dépendances)
- **Taille installée:** ~150-200 MB
- **Compatibilité:** Android 7.0+ (API 24+)
- **Architectures:** ARM64 + ARMv7

## 🐛 Dépannage

### L'APK ne s'installe pas
- Vérifier que l'appareil accepte les installations de sources inconnues
- Vérifier la version Android (minimum API 24)
- Essayer: `adb install -r app-release.apk` (forcer la réinstallation)

### L'app crash au démarrage
- Vérifier les logs: `adb logcat | grep KIKO`
- Vérifier que Firebase est accessible
- Vérifier les permissions dans `app.config.ts`

### Erreur de signature
- Vérifier que vous utilisez la même clé de signature
- Supprimer l'app existante: `adb uninstall space.manus.kiko.t...`
- Réinstaller l'APK

## 📚 Ressources

- [EAS Build Documentation](https://docs.expo.dev/build/setup/)
- [Expo Config Reference](https://docs.expo.dev/versions/latest/config/app/)
- [Android Build Guide](https://developer.android.com/build)
- [Firebase Setup](https://firebase.google.com/docs/android/setup)

## 🔐 Sécurité

- Les clés API (Firebase, Cloudinary, ImageKit) sont stockées de manière sécurisée
- Les secrets ne sont jamais committés dans le code
- Les uploads sont chiffrés en transit (HTTPS)

---

**Questions?** Consultez la documentation Expo ou contactez le support.
