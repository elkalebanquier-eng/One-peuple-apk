# Moteur de compilation One App

## Fonctionnement pour les utilisateurs

One App cache les outils techniques. La personne choisit le type de projet, sélectionne son ZIP, lance la compilation et télécharge l’APK debug lorsqu’elle est prête. Aucun compte GitHub, jeton, commande Gradle ou installation d’Android Studio n’est demandé dans l’application.

| Étape interne | Rôle | Donnée conservée |
|---|---|---|
| Réception | Le backend reçoit le ZIP et crée une tâche | Archive temporaire, 50 Mo maximum |
| Attente | Le worker demande la prochaine tâche disponible | Identifiant et type de projet |
| Compilation | Une machine GitHub isolée crée l’APK debug | Fichiers seulement pendant le job |
| Livraison | L’APK est déposée dans le stockage temporaire | Lien de téléchargement dans One App |

## Sécurité

Le worker est défini dans le dépôt public séparé [one-app-build-worker](https://github.com/elkalebanquier-eng/one-app-build-worker). Il ne contient aucun ZIP utilisateur et ne reçoit aucun secret One App. Le workflow s’identifie auprès du backend avec un jeton OIDC temporaire créé par GitHub. La vérification côté serveur limite cette identité au dépôt, à la branche et au workflow officiel.[1]

Les ZIP sont traités comme non fiables. L’extraction bloque les liens symboliques, les sorties de dossier, les répertoires générés, les archives trop volumineuses et les projets contenant trop de fichiers. Chaque job est limité à 35 minutes.

## Limites de la première version

La première version produit uniquement des **APK debug**. Elles servent à installer et tester une application sur Android ; elles ne sont pas le format final de publication sur Google Play.[2] One App limite les archives à 50 Mo et les demandes à deux compilations par heure pour protéger le service gratuit.

Le backend One App doit rester **publié et en ligne** : il reçoit l’archive, garde l’état de la compilation et sert l’APK. L’adresse publique du backend est inscrite au moment de la génération de l’APK One App et dans le workflow du worker. Lors d’un changement d’hébergement, ces deux configurations doivent être mises à jour ensemble.

## Vérification réalisée

Un projet HTML de démonstration a parcouru le flux complet : ZIP envoyé, tâche réclamée via OIDC, compilation GitHub terminée avec succès, APK téléchargée et contrôlée comme paquet Android signé. Les projets Expo et Android natif empruntent le même parcours isolé avec leurs outils de build respectifs ; ils doivent être testés avec des projets réels représentatifs avant une diffusion à grande échelle.

## Références

[1] [GitHub Docs — OpenID Connect reference](https://docs.github.com/actions/reference/openid-connect-reference)

[2] [Android Developers — Sign your app](https://developer.android.com/studio/publish/app-signing)
