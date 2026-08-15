# KIKO👑 Native App — TODO

## Core Features

- [x] Home Screen avec scroll feed
- [x] Stories animées (bulles avec dégradé)
- [x] Video Cards avec actions (like, comment, share)
- [x] Buzz Screen plein écran avec snap scroll
- [x] Opportunities Screen avec filtres
- [x] Profile Screen
- [x] Settings Screen
- [x] Tab bar navigation (Home, Buzz, Opportunities, Profile, Settings)
- [x] Theme personnalisé (couleurs KIKO)
- [x] App logo et branding

## Video Features

- [ ] Lecteur vidéo avec contrôles
- [ ] Mute/unmute
- [ ] Barre de progression
- [ ] Pull-to-refresh

## Interactions

- [ ] Haptic feedback sur actions
- [ ] Press feedback (scale)
- [ ] Animations story ring
- [ ] Transitions entre écrans

## Data & State

- [ ] Mock data pour feed
- [ ] Mock data pour stories
- [ ] Mock data pour opportunities
- [ ] State management (Context/Zustand)
- [ ] AsyncStorage pour persistance locale

## Optimization

- [ ] Lazy loading images
- [ ] Virtual scrolling pour feed
- [ ] Caching avatars/images
- [ ] Compression vidéo

## Branding

- [ ] Logo généré
- [ ] Couleurs appliquées
- [ ] app.config.ts mis à jour
- [ ] Splash screen
- [ ] Icons adaptifs Android

## Firebase Integration

- [x] Intégrer Firebase Realtime Database
- [x] Charger les posts depuis Firebase (jobPosts collection)
- [x] Charger les vidéos depuis Firebase (videos collection)
- [ ] Implémenter l'authentification utilisateur (phone + password)
- [ ] Charger les stories depuis Firebase
- [ ] Synchroniser les likes avec Firebase
- [ ] Charger les commentaires en temps réel
- [ ] Implémenter le système de suivi (following)
- [x] Charger les opportunités avec filtres
- [ ] Synchroniser les données utilisateur (profil, bio, avatar)

## Media Upload Integration

- [x] Intégrer Cloudinary pour les vidéos
- [x] Intégrer ImageKit pour les images
- [x] Optimisation des images avec compression
- [x] Service de gestion des URLs média

## APK Build Configuration

- [x] Configuration EAS Build
- [x] Guide de génération APK
- [x] Script de build APK
- [x] Configuration app.config.ts pour Android

## Media Publishing Features

- [x] Service d'accès à la galerie (expo-image-picker)
- [x] Service d'accès à la caméra (expo-camera)
- [x] Écran de création de post (photo/vidéo)
- [x] Compression des images et vidéos
- [x] Upload vers Cloudinary et ImageKit
- [x] Formulaire de publication avec description
- [x] Sauvegarde dans Firebase après upload
- [x] Affichage du statut d'upload (progress bar)
- [x] Gestion des erreurs d'upload
- [x] Permissions pour caméra et galerie

## GitHub et préparation du build Android

- [x] Vérifier la connexion GitHub disponible
- [ ] Identifier ou confirmer le dépôt GitHub cible — création bloquée par les permissions GitHub du compte
- [x] Ajouter la configuration de build Android reproductible
- [x] Ajouter le workflow GitHub Actions pour générer un APK
- [ ] Synchroniser le code KIKO avec GitHub — dépôt distant non créé
- [x] Vérifier le projet et documenter l'installation de l'APK

## Historique de la demande

- [ ] Préparer un dépôt GitHub complet pour permettre la construction de l'application KIKO — permissions de création insuffisantes
- [x] Fournir une méthode d'installation directe de l'APK sans WebView

---

**Note de sécurité :** les clés Firebase, Cloudinary, ImageKit et les secrets GitHub ne doivent pas être écrits en clair dans le dépôt. Ils seront configurés via les secrets GitHub ou l'interface de configuration sécurisée.

## Livrables demandés

- [x] Vérifier la configuration Android et la présence du SDK/Gradle
- [x] Préparer un profil de build debug reproductible
- [ ] Générer et tester l’APK debug installable — build local interrompu par les limites de ressources
- [x] Créer une archive complète du code source
- [x] Ajouter la documentation d’installation et de lancement
- [ ] Livrer l’APK debug et l’archive source — archive prête, APK non généré

**Sécurité :** ne pas inclure les clés Firebase, Cloudinary, ImageKit ou les jetons GitHub dans l’archive source.
