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
- [x] AsyncStorage pour persistance locale

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

## Firebase Integration (ancienne version retirée du code actif)

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

## Media Upload Integration (ancienne version distante retirée du code actif)

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
- [x] Identifier ou confirmer le dépôt GitHub cible — `elkalebanquier-eng/One-peuple-apk` confirmé
- [x] Ajouter la configuration de build Android reproductible
- [x] Ajouter le workflow GitHub Actions pour générer un APK
- [x] Synchroniser le code KIKO avec GitHub — push réussi sur la branche `main`
- [x] Vérifier le projet et documenter l'installation de l'APK

## Historique de la demande

- [x] Préparer un dépôt GitHub complet pour permettre la construction de l'application KIKO — dépôt public synchronisé
- [x] Fournir une méthode d'installation directe de l'APK sans WebView

---

**Note de sécurité :** les clés Firebase, Cloudinary, ImageKit et les secrets GitHub ne doivent pas être écrits en clair dans le dépôt. Ils seront configurés via les secrets GitHub ou l'interface de configuration sécurisée.

## Livrables demandés

- [x] Vérifier la configuration Android et la présence du SDK/Gradle
- [x] Préparer un profil de build debug reproductible
- [x] Générer et tester l’APK debug installable — build GitHub Actions réussi et fichier APK vérifié
- [x] Créer une archive complète du code source
- [x] Ajouter la documentation d’installation et de lancement
- [x] Livrer l’APK debug et l’archive source — APK et archive préparés

**Sécurité :** ne pas inclure les clés Firebase, Cloudinary, ImageKit ou les jetons GitHub dans l’archive source.

## Synchronisation GitHub — dépôt fourni

- [x] Vérifier le dépôt public https://github.com/elkalebanquier-eng/One-peuple-apk.git
- [x] Comparer son contenu avec le projet KIKO local (dépôt initialement vide)
- [x] Synchroniser le code source et la configuration de build — push réussi sur la branche main
- [x] Vérifier le workflow GitHub Actions — présent dans `.github/workflows/build-debug-apk.yml`
- [x] Confirmer à l’utilisateur l’état de la synchronisation et fournir le lien du dépôt

## Mode hors base de données et optimisation APK

- [x] Désactiver temporairement Firebase et les appels serveur dans l’application mobile
- [x] Conserver l’interface et la navigation existantes sans refaire le site
- [x] Remplacer les chargements distants par un état local minimal lorsque nécessaire
- [x] Retirer les dépendances et ressources inutiles du paquet Android
- [x] Vérifier la taille et le comportement de l’APK debug
- [x] Livrer le code source mis à jour et l’APK debug

## Exigence de compilation vérifiée

- [x] Ne livrer aucun APK avant une compilation Android réussie
- [x] Vérifier que l’APK produit est bien un fichier installable
- [x] Documenter clairement tout échec de compilation au lieu de présenter une archive comme APK

## Vérification distante GitHub et écran de test

- [x] Cloner et inspecter la branche main du dépôt distant `elkalebanquier-eng/One-peuple-apk`
- [ ] Créer un écran de test séparé pour diagnostiquer le comportement natif sans modifier l’interface principale KIKO
- [ ] Lancer et surveiller un nouveau workflow GitHub Actions pour valider la compilation
- [ ] Vérifier et livrer le nouvel APK debug certifié
