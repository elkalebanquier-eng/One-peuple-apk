# KIKO👑 Native App — TODO

## Refonte visuelle One App

- [x] Refaire l’accueil pour clarifier immédiatement l’action « importer et compiler »
- [x] Refaire l’écran Nouvelle compilation avec un choix de type plus visuel et rassurant
- [x] Refaire les statuts de compilation et le téléchargement APK pour qu’ils soient lisibles sur téléphone
- [x] Harmoniser la navigation et les réglages avec la nouvelle identité One App

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
- [x] Lancer et surveiller un nouveau workflow GitHub Actions pour valider la compilation
- [x] Vérifier et livrer le nouvel APK debug certifié

## Correction de l’erreur Unable to load script (bundle Metro vs APK autonome)

- [x] Analyser la capture d’écran de l’erreur d’exécution sur le téléphone
- [x] Modifier la configuration Gradle / Expo pour forcer le bundle JS embarqué dans l’APK (mode release / bundle offline)
- [x] Relancer un build GitHub Actions avec packaging complet du script
- [x] Fournir l’importance et la valeur de l’application KIKO à l’utilisateur

## APK autonome et compilation depuis téléphone

- [x] Garantir que l’APK installée ne cherche pas Metro ni localhost:8081
- [ ] Documenter une procédure mobile GitHub pour envoyer les modifications et déclencher un nouvel APK
- [x] Recompiler et valider l’APK autonome sans écran de développement

## KIKO Studio — plateforme de création d’applications

- [x] Remplacer le concept d’application sociale par un constructeur d’applications mobile
- [x] Créer un parcours : nouveau projet, modèle, personnalisation, aperçu et soumission au build
- [x] Définir un service distant sécurisé de dépôt du code et de compilation Android
- [ ] Préparer les exigences Play Store : AAB signé, identité éditeur, politique de confidentialité et validation

## KIKO Studio — import et compilation simplifiés

- [x] Permettre à un utilisateur d’importer un projet depuis son téléphone
- [x] Masquer GitHub, Gradle, Metro et Android Studio derrière un bouton de compilation simple
- [x] Valider et isoler les projets importés avant toute compilation distante
- [x] Afficher dans One App l’état du build et proposer le téléchargement de l’APK debug

## Première version : APK debug uniquement

- [x] Générer des APK debug installables pour les tests, sans préparation AAB ni publication automatique
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
- [x] Indiquer les limites de la version gratuite sans demander de serveur payant

## Expérience entièrement One App

- [x] Retirer la connexion GitHub et toute mention GitHub du parcours utilisateur
- [x] Présenter l’import, l’envoi et le suivi comme des fonctions internes à One App
- [x] Prévoir un point d’intégration interne pour le service de compilation, sans action utilisateur externe

## Livraison transparente

- [x] Présenter clairement ce que One App peut faire aujourd’hui et ce qui reste indisponible sans service de compilation

## Moteur de compilation distant One App

- [x] Choisir et documenter l’architecture gratuite de compilation distante adaptée aux ZIP importés
- [x] Créer un service backend de soumission et de suivi des compilations réelles
- [x] Déployer un environnement isolé de build pour les projets Expo, Android natif et HTML
- [x] Ajouter dans One App les statuts réels, la récupération de l’APK et les erreurs de compilation
- [x] Compiler de bout en bout un index.html simple au moyen du parcours utilisateur et vérifier l’APK obtenue
- [x] Empêcher une archive invalide de consommer une tentative gratuite de compilation

## Import HTML direct

- [x] Accepter directement un fichier index.html dans le sélecteur de fichiers Android
- [x] Préparer automatiquement un index.html en archive compatible avec le moteur de compilation
- [x] Tester la préparation index.html directe puis reconstruire l’APK One App
- [x] Détecter une réponse HTML ou un service indisponible et montrer une erreur simple dans One App
- [x] Ne pas configurer l’URL du moteur publiée dans l’APK de production : aucun backend ne sera publié
- [x] Ne pas envoyer d’index.html depuis l’APK locale : cette version ne compile pas à distance

## Correction du serveur de compilation

- [x] Ne pas publier le backend One App, à la demande explicite de l’utilisateur
- [x] Ne pas ajouter d’adresse publique permanente dans l’APK ni dans les workflows
- [x] Ne pas envoyer d’index.html à distance : le mode local ne contacte aucun serveur

## Mode APK local sans publication

- [x] Désactiver le parcours de compilation distante à la demande de l’utilisateur, sans publier de backend ni de site
- [x] Expliquer dans One App, avec un message simple, que compiler un nouveau code ne peut pas fonctionner depuis une APK seule hors ligne
- [x] Annuler la recréation d’une APK locale seule : le moteur GitHub reste nécessaire pour compiler réellement

## Moteur GitHub invisible dans One App

- [x] Restaurer l’envoi sécurisé du ZIP et le suivi de compilation depuis l’APK
- [x] Rétablir les textes « compiler » et « APK prête » dans le design One App
- [x] Corriger le lancement du backend de compilation sans créer de site visible pour les utilisateurs
- [x] Intégrer l’adresse backend durable dans One App après sa disponibilité
- [x] Envoyer un index.html de contrôle vers le backend publié et vérifier l’APK créée
- [x] Corriger le téléchargement de l’artifact APK par le workflow de livraison isolé
- [x] Corriger la configuration du bundle Android qui empêche Metro de charger ses fichiers CommonJS
- [x] Construire et vérifier l’APK One App contenant l’adresse du moteur GitHub actif

## Correction du téléchargement APK

- [x] Vérifier le fichier de 24 Ko : il contient AndroidManifest.xml et classes.dex, donc il s’agit bien d’une APK Android minimale
- [ ] Télécharger l’APK dans le téléphone depuis One App sans ouvrir Brave, GitHub ou une page web
- [x] Vérifier qu’une APK reçue contient AndroidManifest.xml et classes.dex avant de la proposer à l’installation
- [ ] Ouvrir l’installateur Android après le téléchargement direct, avec l’autorisation système si nécessaire

## Parcours accessible aux débutants

- [x] Employer des consignes simples à chaque étape sans citer GitHub, Gradle ni Metro
- [x] Ajouter des explications concrètes sur le ZIP attendu pour chaque type de projet
- [x] Convertir les erreurs de compilation en conseils courts et compréhensibles
- [x] Présenter le téléchargement et l’installation de l’APK sous forme d’étapes guidées
- [x] Réutiliser l’autorisation GitHub déjà connectée sans demander de jeton ou de réglage aux utilisateurs
- [x] Remplacer le déclenchement authentifié par une file de build sécurisée ne demandant aucun jeton utilisateur

## Accompagnement mobile

- [x] Présenter l’architecture et les prochaines étapes avec des explications utilisables uniquement depuis un téléphone
- [x] Vérifier une solution de stockage temporaire d’APK réellement utilisable sans carte bancaire

- [x] Abandonner R2 pour les ZIP et APK : Cloudflare demande une carte bancaire lors de l’activation
- [x] Préparer puis retirer la couche R2 non activable, sans exposer de clé dans One App
- [x] Remplacer la suppression R2 par le nettoyage automatique des APK GitHub après 48h
- [x] Remplacer les liens R2 par une publication GitHub temporaire isolée du code importé
- [x] Remplacer le test R2 par la vérification du parcours GitHub temporaire
- [x] Documenter que le bucket R2 ne sera pas créé sans activation nécessitant une carte bancaire

## Stockage sans carte bancaire

- [x] Vérifier la faisabilité du stockage et de la livraison temporaire d’APK avec GitHub public
- [x] Remplacer le stockage R2 bloqué par une distribution temporaire gratuite compatible avec One App
- [x] Ajouter la suppression automatique des APK temporaires sans service payant
- [x] Isoler la publication GitHub de la compilation du code importé afin de ne pas exposer de droit d’écriture au projet utilisateur
- [x] Faire terminer la compilation seulement après la publication vérifiée de l’APK temporaire
- [x] Conserver le ZIP seulement en mémoire jusqu’à sa récupération sécurisée par le worker, puis le supprimer
- [x] Retirer l’adaptateur R2 inactif et ses dépendances afin de ne garder aucune configuration demandant une carte bancaire

## Relance et nouveau logo One Peuple

- [x] Ajouter un bouton « Relancer » qui utilise le dernier fichier importé sans le sélectionner à nouveau
- [x] Appliquer le logo One Peuple fourni aux icônes, au splash screen et à la configuration de One App

## Correction du statut de compilation bloqué

- [x] Diagnostiquer une compilation qui reste durablement sur « Dans la file »
- [x] Afficher un résultat clair : compilation active, erreur compréhensible ou possibilité de relancer

## Icône personnalisée de l’APK générée

- [x] Permettre de choisir une image d’icône depuis le téléphone avant la compilation
- [x] Conserver l’icône avec le projet envoyé et l’appliquer à l’APK générée
- [x] Vérifier la sélection, la transmission et la génération d’icône pour les projets Expo, Android et HTML

## Correction de récupération du projet par le worker

- [x] Fournir au worker les URL publiques sécurisées du ZIP et de l’icône, sans hôte interne

## Livraison directe de l’APK sans action utilisateur

- [x] Fournir directement le fichier APK installable sans demander de cliquer sur Publier

## Configuration d’identité de l’APK générée

- [x] Ajouter un champ de nom de package Android avec validation simple
- [x] Ajouter un champ de version de l’application avec validation simple
- [ ] Transmettre et appliquer package et version pendant la compilation
- [x] Vérifier l’état de la compilation index.html récemment soumise

## Progression du téléchargement APK

- [x] Afficher le pourcentage et la taille réellement téléchargée dans One App
- [x] Indiquer clairement un téléchargement bloqué et permettre de le relancer

## Téléchargement fiable et nouveau design

- [x] Vérifier la taille et l’ouverture de l’APK avant de lancer l’installateur Android
- [x] Revoir le style du tableau de bord pour une lecture plus moderne et plus claire
- [x] Revoir le style de l’écran de création pour guider chaque étape simplement

## Optimisation APK et compilation

- [x] Réduire la taille de l’APK sans retirer les fonctions de One App
- [x] Accélérer le workflow Android avec les caches de dépendances
- [ ] Comparer la taille et la durée de l’APK optimisée à la version actuelle

## Assistant Cloudflare AI

- [x] Vérifier l’accès Cloudflare AI déjà configuré pour le projet
- [x] Ajouter un assistant qui écrit ou corrige le code et guide sa préparation
- [x] Protéger les requêtes IA et limiter les demandes depuis One App

## Assistant Cloudflare AI d’écriture de code

- [x] Ajouter une zone où l’utilisateur décrit l’application ou la correction souhaitée
- [x] Générer du code HTML, Expo ou Android adapté au type de projet choisi dans le relais Workers AI
- [x] Permettre d’utiliser le code HTML IA dans le projet avant de lancer la compilation
- [x] Recompiler One App avec l’assistant IA et vérifier l’APK Android obtenue
- [x] Préparer une archive source sans dépendances générées ni secrets

## Historique des codes IA

- [x] Enregistrer localement chaque demande IA et le code généré sur le téléphone
- [x] Afficher les anciennes demandes de manière lisible dans l’onglet IA Code
- [x] Permettre de rouvrir, réutiliser ou supprimer un ancien code généré
- [x] Tester la persistance de l’historique sans connexion et ses limites de taille

## Intégration Cloudflare déjà connectée

- [x] Vérifier les capacités Workers AI accessibles via la connexion Cloudflare active
- [x] Créer un relais Cloudflare Workers AI limité, sans clé exposée dans l’APK
- [x] Vérifier une génération HTML réelle via le relais Cloudflare
- [x] Connecter l’application One App au relais sans exposer d’accès dans l’APK

## Accès gratuit Cloudflare Workers AI

- [ ] Créer un compte Cloudflare gratuit et activer Workers AI
- [ ] Créer un jeton Workers AI avec les droits minimaux
- [ ] Enregistrer l’identifiant de compte et le jeton dans les réglages sécurisés de One App

## Vérification sans carte bancaire

- [x] Vérifier officiellement si Workers AI impose une carte bancaire à l’activation

## Qualité professionnelle de l’assistant IA

- [x] Définir des règles de réponse professionnelles adaptées à HTML, Expo et Android
- [x] Exiger du code structuré, complet et directement exploitable avant la compilation
- [x] Ajouter une explication claire, des prérequis et une liste de vérifications au résultat IA
- [x] Tester les réponses HTML, Expo et Android avec les améliorations de qualité
- [x] Reconstruire l’APK avec les améliorations de qualité

## Prévisualisation du code IA

- [x] Afficher le code généré dans une prévisualisation lisible avant la compilation
- [x] Permettre de fermer la prévisualisation ou de préparer le code depuis celle-ci
- [x] Prévisualiser aussi un code rouvert depuis l’historique local
- [x] Tester le flux de prévisualisation avec TypeScript et les tests unitaires
- [x] Reconstruire l’APK avec la prévisualisation

## Copie du code prévisualisé

- [x] Ajouter un bouton pour copier l’intégralité du code dans le presse-papiers
- [x] Afficher une confirmation simple après la copie
- [x] Vérifier TypeScript et les tests unitaires après l’intégration du presse-papiers
- [x] Reconstruire l’APK afin de vérifier le module natif de copie

## Diagnostic d’APK non reçue

- [x] Reproduire une compilation HTML simple depuis le moteur One App
- [x] Vérifier la soumission, la file, le worker, la publication temporaire et le statut final
- [x] Corriger toute erreur empêchant l’APK de revenir dans l’application
- [x] Valider TypeScript et les tests de régression de livraison
- [x] Corriger la transmission des métadonnées de livraison vers le publieur isolé et valider une APK prête
- [ ] Vérifier le téléchargement direct et l’ouverture de l’installateur Android

## MIA — assistant conversationnel

- [x] Transformer l’ancien générateur IA en MIA, assistant de conversation naturel
- [x] Adapter le relais Cloudflare pour retourner une réponse lisible et, si utile, du code séparé
- [x] Refaire l’onglet IA Code en conversation MIA avec actions rapides et historique local
- [x] Conserver les actions de copie, prévisualisation et préparation HTML vers la compilation
- [x] Valider les nouveaux messages, TypeScript et les tests avant de reconstruire l’APK
- [x] Ajouter une navigation de discussions, un bouton Nouveau chat et des actions rapides MIA
- [x] Présenter chaque réponse de code avec Voir le code, Copier et Préparer l’APK

## Animation de frappe MIA

- [x] Afficher un indicateur discret pendant que MIA prépare une réponse
- [x] Révéler progressivement le texte de la réponse MIA sans bloquer les actions de code
- [x] Valider l’animation, TypeScript et les tests avant de reconstruire l’APK

## Quota de compilation gratuit

- [x] Faire passer la limite gratuite de deux à six compilations par heure
- [x] Adapter le message de limite et valider les tests de quota

## Indicateur de compilations restantes

- [x] Exposer le nombre de compilations restantes dans les réponses du moteur
- [x] Afficher un indicateur clair de quota restant dans l’écran principal
- [x] Valider le compteur, TypeScript et les tests de régression
- [x] Compiler l’APK et préparer le code source correspondant pour livraison directe

## APK signée pour publication

- [x] Ajouter le choix APK debug ou APK signée avec une explication simple
- [x] Générer une clé propre au projet sans conserver son mot de passe dans le moteur
- [x] Compiler une APK release signée et préparer une sauvegarde temporaire de la clé `.jks`
- [x] Permettre le téléchargement de l’APK signée et de la clé uniquement depuis le téléphone
- [x] Tester les protections, la compilation release et la remise des fichiers

## Jauge et partage direct d’APK

- [x] Ajouter une jauge circulaire lisible pour le nombre de compilations restantes
- [x] Ajouter un bouton pour envoyer une APK téléchargée vers les applications du téléphone
- [x] Valider TypeScript, les tests et le parcours de partage Android
- [x] Compiler et préparer la nouvelle APK debug pour livraison directe

## Génération de logo avec MIA

- [x] Vérifier un modèle de génération d’image gratuit compatible avec le relais Cloudflare de MIA
- [x] Définir le parcours mobile : décrire, générer, choisir et appliquer un logo à l’APK
- [x] Présenter le plan d’intégration avant toute modification de MIA
- [x] Créer les types, la validation et le stockage local d’un logo MIA
- [x] Ajouter une route Cloudflare protégée pour générer le logo et limiter les demandes
- [x] Ajouter dans MIA le formulaire, l’aperçu et les actions de validation du logo
- [x] Utiliser le logo validé comme icône dans le formulaire de nouvelle compilation
- [x] Tester le relais, le stockage et le parcours de préparation d’APK
- [x] Déployer le relais, compiler l’APK debug et livrer les fichiers actualisés
- [x] Ajouter une analyse MIA qui détecte les blocages probables avant compilation
- [x] Afficher les erreurs, avertissements et corrections simples avant l’envoi du code
- [x] Tester la vérification pour les projets HTML, Expo et Android
- [x] Renommer l’application visible en MIA💻 sans changer le package Android
- [x] Ajouter un choix entre MIA Cloudflare et KIA Gemini dans le chat
- [x] Acheminer les messages et la génération de code vers Gemini sans exposer sa clé
- [x] Conserver des conversations distinctes et locales pour chaque assistant

## Mode Agent MIA💻 — API, IA et données

- [x] Définir les connecteurs autorisables et les limites de chaque action
- [x] Concevoir un écran de consentement et de confirmation avant toute opération sensible
- [x] Préparer une feuille de route pour un relais sécurisé sans clés intégrées dans l’APK
