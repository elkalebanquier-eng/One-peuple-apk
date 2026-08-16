# One App — Architecture de compilation debug

## Objectif

One App est l’application Android publiée par l’éditeur. Elle permet à une personne de sélectionner le type de son projet, d’importer une archive ZIP depuis son téléphone, puis de demander une **APK debug** sans manipuler Metro, Gradle, Android Studio ou GitHub.

> **Décision de produit :** le téléphone est une interface d’import et de suivi. La compilation s’effectue dans un environnement distant éphémère et isolé ; le code importé ne s’exécute jamais dans l’application One App.

## Formats proposés au premier lancement

| Type choisi avant l’import | Archive attendue | Contrôles minimaux avant envoi | Sortie attendue |
|---|---|---|---|
| **Expo / React Native** | ZIP contenant `package.json` et `app.json` ou `app.config.*` | Dépendances bloquées, absence de `node_modules`, structure Expo valide | APK debug Android |
| **Android natif** | ZIP contenant le wrapper Gradle et un module `app` | Présence de `settings.gradle` et `build.gradle`, absence de binaires exécutables | APK debug Android |
| **HTML / CSS / JavaScript** | ZIP contenant `index.html` | Page d’entrée, ressources locales et taille de l’archive | APK debug empaquetée selon le moteur HTML retenu |

Les archives ne doivent pas contenir de secrets, de clés de signature, de dossiers `node_modules`, de dossiers `build`, ni de fichiers exécutables. One App affiche ces règles avant l’envoi et bloque l’envoi si le type n’est pas sélectionné.

## Parcours de compilation

| Étape | Action utilisateur | Travail de la plateforme | État visible |
|---|---|---|---|
| 1. Nouveau build | La personne touche « Nouveau build » | Crée un brouillon local | Brouillon |
| 2. Type de projet | Elle choisit Expo, Android ou HTML | Charge les instructions adaptées | Type choisi |
| 3. Import ZIP | Elle sélectionne une archive depuis le téléphone | Copie temporaire et vérification locale | Fichier prêt |
| 4. Envoi | Elle touche « Envoyer et compiler » | Téléverse l’archive, valide le manifeste, crée un job | En attente |
| 5. Compilation | Elle consulte le suivi | Lance un runner éphémère correspondant au type du projet | Compilation |
| 6. Résultat | Elle touche « Télécharger l’APK debug » | Conserve l’artefact temporairement et fournit un lien signé | Terminé ou erreur |

## Règles de sécurité essentielles

Le backend doit traiter chaque ZIP comme du contenu non fiable. Chaque compilation doit être isolée, disposer de limites de durée, de mémoire, de taille et de réseau, puis être supprimée après production de l’artefact. Les clés de signature de One App ne doivent jamais être stockées dans les archives d’utilisateurs ni exposées dans les journaux.

Le service ne doit pas envoyer le code d’un utilisateur dans un dépôt public partagé. Le produit public doit utiliser une file de jobs et des runners isolés, avec des autorisations internes explicites et sans exposer son moteur de compilation dans l’interface.

## Moteur gratuit retenu

One App emploie un dépôt public séparé qui contient uniquement le workflow de compilation. Le ZIP source reste dans le stockage temporaire du backend et n’est transmis à la machine de compilation qu’au moyen d’une URL de téléchargement limitée dans le temps. Le dépôt de workflow ne reçoit aucune copie du projet, aucun secret One App et aucun droit d’écriture pendant l’exécution. Le workflow réclame une tâche dans la file au moyen d’une identité OIDC temporaire vérifiée par le backend ; aucun jeton personnel GitHub n’est demandé à l’éditeur ni inclus dans l’APK.

| Moment | Composant | Donnée conservée | Garantie appliquée |
|---|---|---|---|
| Import | Application One App | Copie privée temporaire du ZIP | Le fichier demeure dans l’espace de l’application jusqu’à son envoi. |
| Soumission | Backend One App | ZIP et identifiant de build | Limite de 50 Mo, type obligatoire et contrôle serveur. |
| Compilation | Machine GitHub éphémère | Source extraite uniquement pendant le job | Durée maximale de 35 minutes, pas de secret et pas de permission de dépôt. |
| Livraison | Artefact GitHub temporaire | APK debug pendant un jour | Le téléchargement passe par le backend ; la carte du build montre le résultat réel. |

Les machines standard de GitHub Actions sont gratuites dans les dépôts publics, ce qui permet une première version sans serveur de compilation payant.[3] Cette gratuité ne remplace pas les garde-fous : une limite de taille, une rétention courte et un plafond de durée restent nécessaires pour protéger le service contre les fichiers trop lourds ou abusifs.

Le serveur One App reste nécessaire pour recevoir le ZIP, conserver brièvement l’état du build et livrer l’APK. Il doit rester publié pour que les APK installées puissent démarrer une compilation. L’URL publique du serveur est une configuration de livraison, pas un secret ; elle doit être actualisée lors d’un changement d’hébergement.

## Sortie et limites

La première version remet une APK debug destinée aux tests. Les applications Android doivent être signées pour pouvoir être installées et mises à jour ; les certificats debug sont conçus pour le développement et ne sont pas acceptés pour une publication Play Store [1].

Une publication Play Store ultérieure demandera un parcours distinct : signature de publication, compte Play Console de l’éditeur concerné et génération d’un Android App Bundle (AAB). Le format AAB contient le code et les ressources compilés, puis Google Play produit les APK optimisées pour les appareils [2].

## Références

[1] [Android Developers — Sign your app](https://developer.android.com/studio/publish/app-signing)

[2] [Android Developers — About Android App Bundles](https://developer.android.com/guide/app-bundle)

[3] [GitHub Docs — Billing for GitHub Actions](https://docs.github.com/billing/managing-billing-for-github-actions/about-billing-for-github-actions)
