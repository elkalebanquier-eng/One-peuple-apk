# Feuille de route — mode Agent de MIA💻

## Réponse courte

**Oui, c’est possible.** MIA💻 peut devenir un agent qui utilise des API, d’autres IA et des bases de données, mais chaque connexion et chaque action doivent être clairement autorisées par la personne qui utilise le téléphone.

> MIA💻 ne doit jamais posséder un accès général au téléphone, ni conserver le mot de passe d’un utilisateur, ni publier, supprimer ou payer sans confirmation.

## Première version recommandée : Agent manuel

La première version fonctionne lorsque MIA💻 est ouverte. La personne choisit un service, décrit le résultat voulu, examine le plan proposé, puis confirme chaque action sensible. Cette approche respecte la contrainte actuelle de One App : pas de base de données distante obligatoire et pas de tâche cachée en arrière-plan.

| Étape | Ce que fait l’utilisateur | Ce que fait MIA💻 |
|---|---|---|
| 1. Choisir | Touche **Mode Agent** et sélectionne un connecteur. | Explique les droits nécessaires. |
| 2. Autoriser | Se connecte au service dans son écran officiel. | Reçoit un jeton limité, jamais le mot de passe. |
| 3. Demander | Écrit par exemple : « prépare une publication avec cette vidéo ». | Produit un plan détaillé et les données à envoyer. |
| 4. Vérifier | Lit le résumé : destinataire, contenu, service et effet. | Attend une confirmation lorsqu’il s’agit d’écrire, publier, supprimer ou dépenser. |
| 5. Exécuter | Confirme. | Appelle seulement l’API autorisée, puis affiche le résultat. |
| 6. Révoquer | Peut toucher **Déconnecter** à tout moment. | Efface le jeton local et révoque l’accès lorsque le service le permet. |

## Connecteurs à ajouter dans le bon ordre

| Priorité | Connecteur | Première capacité sûre | Confirmation |
|---|---|---|---|
| 1 | Gemini / KIA | Répondre, analyser, écrire du code | Non pour une réponse texte ; aucune donnée privée envoyée sans accord. |
| 2 | Cloudflare / MIA | Générer ou vérifier du code et un logo | Non pour une réponse texte ; quota visible. |
| 3 | GitHub | Lire un dépôt, créer une branche ou une issue | Oui avant tout envoi ou modification. |
| 4 | Base de données choisie | Lire une table ou préparer une modification | Non pour lecture autorisée ; oui pour ajouter, modifier ou supprimer. |
| 5 | Réseaux sociaux et messagerie | Préparer un brouillon | Oui, toujours, avant publication ou envoi. |

## Architecture sécurisée

```text
Téléphone MIA💻
   │  demande + accord explicite
   ▼
Relais Agent sécurisé
   │  jeton court et droit minimal
   ▼
API autorisée (GitHub, IA, base, réseau social)
   │
   └── résultat vers MIA💻 + journal local
```

Le relais n’exécute pas une instruction libre et illimitée. Il expose des actions précises, telles que `lire_projet`, `préparer_publication` ou `créer_brouillon`. Chaque action a un schéma de données, un niveau de risque et un écran de confirmation.

## Règles non négociables

1. **Pas de clé dans l’APK.** Les clés de MIA, KIA et des API restent côté relais sécurisé ; une APK peut être extraite et ne protège pas un secret.
2. **Droits minimaux.** Une connexion lecture seule ne peut pas écrire ; une connexion à un seul dépôt ne peut pas modifier tous les dépôts.
3. **Toujours confirmer les actions sensibles.** Poster, envoyer, supprimer, modifier une base, payer, partager un fichier ou rendre une donnée publique doit afficher un récapitulatif et attendre un appui explicite.
4. **Pas d’exécution permanente dans la première version.** Sans stockage serveur choisi par la personne, l’agent agit seulement pendant que l’app est ouverte. Il n’exécute pas de tâche silencieuse plus tard.
5. **Journal et révocation.** L’utilisateur voit ce qui a été fait et peut déconnecter un service à tout moment.

## Écrans à ajouter plus tard

| Écran | Rôle |
|---|---|
| **Agent** | Zone de demande avec le choix du service ou de l’assistant. |
| **Connecteurs** | Liste : connecté, droits accordés, date, bouton déconnecter. |
| **Confirmation** | Récapitulatif de l’action avant écriture, publication, suppression ou envoi. |
| **Historique d’actions** | Résultats locaux : préparé, confirmé, réussi ou refusé. |

## Ce qui n’est pas encore intégré

Le présent APK MIA💻 contient MIA Cloudflare, KIA Gemini, le logo IA avec gestion des limites et la vérification de code avant compilation. Il **ne contient pas encore le mode Agent** ni de connecteur utilisateur pour GitHub, une base de données ou les réseaux sociaux. Cette feuille de route est le plan sûr avant de l’ajouter.

## Décision à prendre avant le développement

Le meilleur premier connecteur Agent est **GitHub en lecture seule**, puis la création d’une *issue* ou d’une branche après confirmation. Cela permet de tester l’architecture sans risquer une publication publique, un paiement ou une suppression de données.
