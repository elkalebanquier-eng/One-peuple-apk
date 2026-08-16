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

## Correction de l’erreur Unable to load script (bundle Metro vs APK autonome)

- [x] Analyser la capture d’écran de l’erreur d’exécution sur le téléphone
- [ ] Modifier la configuration Gradle / Expo pour forcer le bundle JS embarqué dans l’APK (mode release / bundle offline)
- [ ] Relancer un build GitHub Actions avec packaging complet du script
- [ ] Fournir l’importance et la valeur de l’application KIKO à l’utilisateur

## APK autonome et compilation depuis téléphone

- [ ] Garantir que l’APK installée ne cherche pas Metro ni localhost:8081
- [ ] Documenter une procédure mobile GitHub pour envoyer les modifications et déclencher un nouvel APK
- [ ] Recompiler et valider l’APK autonome sans écran de développement

## KIKO Studio — plateforme de création d’applications

- [x] Remplacer le concept d’application sociale par un constructeur d’applications mobile
- [x] Créer un parcours : nouveau projet, modèle, personnalisation, aperçu et soumission au build
- [ ] Définir un service distant sécurisé de dépôt du code et de compilation Android
- [ ] Préparer les exigences Play Store : AAB signé, identité éditeur, politique de confidentialité et validation

## KIKO Studio — import et compilation simplifiés

- [ ] Permettre à un utilisateur d’importer un projet depuis son téléphone ou une adresse de dépôt
- [x] Masquer GitHub, Gradle, Metro et Android Studio derrière un bouton de compilation simple
- [ ] Valider et isoler les projets importés avant toute compilation distante
- [ ] Afficher dans KIKO Studio l’état du build et proposer le téléchargement du résultat APK ou AAB

## Première version : APK debug uniquement

- [ ] Générer des APK debug installables pour les tests, sans préparation AAB ni publication automatique
- [x] Informer clairement l’utilisateur que le fichier est destiné aux tests

## Choix obligatoire avant import du code

- [x] Afficher le choix Expo/React Native, Android natif ou HTML avant toute sélection de fichier
- [x] Adapter les instructions et la validation du ZIP au type de projet choisi
- [x] Empêcher l’envoi tant que le type de projet n’a pas été choisi

## Renommage One App

- [x] Remplacer le nom affiché KIKO Studio par One App dans les écrans et la navigation
- [x] Mettre à jour la configuration Android et la documentation avec le nom One App

## Identité visuelle One App

- [x] Créer et appliquer un logo One App premium aux icônes Android, au splash screen et au favicon

## Version gratuite avec GitHub Actions

- [ ] Permettre une connexion GitHub gratuite une seule fois pour lancer les builds
- [ ] Préparer un dépôt et un workflow de compilation gratuits par utilisateur
- [ ] Indiquer les limites de la version gratuite sans demander de serveur payant

## Expérience entièrement One App

- [x] Retirer la connexion GitHub et toute mention GitHub du parcours utilisateur
- [x] Présenter l’import, l’envoi et le suivi comme des fonctions internes à One App
- [ ] Prévoir un point d’intégration interne pour le service de compilation, sans action utilisateur externe
