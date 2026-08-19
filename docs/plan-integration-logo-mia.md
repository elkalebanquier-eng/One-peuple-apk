# Plan d’intégration — génération de logo IA avec MIA

## Objectif

Ajouter dans MIA une action **« Créer un logo »**. La personne décrit son application, visualise un logo carré généré, puis l’emploie comme icône de l’APK qu’elle compile dans One App. Le parcours reste mobile et ne révèle ni clé d’API ni infrastructure de compilation.

## Choix technique

Le relais Cloudflare existant de MIA peut appeler `@cf/black-forest-labs/flux-1-schnell`. Ce modèle transforme un prompt en image et retourne l’image encodée en Base64. Cloudflare documente un prompt de 1 à 2 048 caractères et de 4 à 8 étapes de diffusion. Une icône de 512 × 512 avec 4 étapes est le meilleur point de départ : elle est carrée, rapide, et convient à la future réduction par Android.[1]

> Le téléphone ne recevra qu’une image finale. Le secret Cloudflare restera dans le Worker MIA : aucune clé ne sera ajoutée à One App.

## Parcours sur téléphone

| Étape | Écran One App | Résultat visible |
|---|---|---|
| 1 | MIA | L’utilisateur touche **Créer un logo** près des suggestions rapides. |
| 2 | Feuille « Mon logo » | Il saisit le nom de l’app, une courte description et, en option, deux couleurs. |
| 3 | Aperçu | MIA affiche un logo carré, avec **Regénérer**, **Modifier la description** et **Utiliser comme icône**. |
| 4 | Nouvelle compilation | Le logo validé apparaît dans le bloc d’icône personnalisée déjà présent. Il peut encore être remplacé par une image du téléphone. |
| 5 | Compilation | L’image est envoyée avec le ZIP existant et devient l’icône de l’APK générée. |

L’action **Utiliser comme icône** copiera le fichier dans l’espace persistant de One App, et non dans un cache provisoire. Ainsi, le logo reste disponible après la fermeture de l’application, jusqu’à sa suppression par la personne.

## Changements à réaliser

| Élément | Modification précise |
|---|---|
| `cloudflare/one-app-ai-worker.js` | Ajouter une route `POST /api/logo` distincte de `/api/code`, qui appelle FLUX.1 schnell, puis retourne `{ imageDataUri, promptSummary }`. |
| Relais Cloudflare | Construire le prompt côté serveur : `icône d’application carrée 512 × 512, symbole unique centré, lisible en petit, sans texte fin, sans filigrane`. Ajouter la description et les couleurs fournies par l’utilisateur. |
| MIA | Ajouter le raccourci **Créer un logo** et une feuille de saisie, sans modifier le chat ni l’historique de code. |
| Stockage local | Créer `lib/mia-logo-generator.ts` et `shared/mia-logo.ts` pour valider la réponse, enregistrer l’image dans le répertoire persistant de One App, et mémoriser seulement son URI locale et sa description. |
| Création APK | Étendre le brouillon de compilation pour réutiliser l’URI de logo MIA dans le sélecteur d’icône existant. Le flux d’envoi d’icône au worker de compilation reste inchangé. |
| Tests | Vérifier le format de la réponse, le contrôle des limites, la sauvegarde locale, la préparation du formulaire avec l’icône, puis compiler une APK de contrôle. |

## Protection et gratuité

Le nouveau chemin doit avoir son propre plafond, proposé à **trois logos par heure et par téléphone**, séparé des 20 messages MIA. Il doit limiter le nom, la description et les couleurs ; il doit aussi refuser les demandes de copie d’une marque, d’un personnage ou d’un logo existant. Une image ne sera jamais stockée publiquement par le Worker : elle est retournée au téléphone, qui la garde localement seulement après validation.

Cloudflare Workers AI offre 10 000 Neurons gratuits par jour, remis à zéro à 00:00 UTC. FLUX.1 schnell est annoncé à 4,80 Neurons par tuile 512 × 512 et 9,60 Neurons par étape ; quatre étapes représentent donc environ 43,2 Neurons pour une icône 512 × 512, hors autres requêtes MIA. Le plafond protège l’allocation, mais One App devra afficher une erreur simple si la limite globale gratuite Cloudflare est déjà atteinte.[2]

## Réponse du Worker attendue

```json
{
  "imageDataUri": "data:image/jpeg;base64,...",
  "promptSummary": "Logo carré pour Mon application"
}
```

Le téléphone convertira ensuite l’image en fichier local carré, redimensionné pour l’icône Android, avant de l’associer au brouillon. L’image Base64 n’est pas conservée dans l’historique conversationnel.

## Décision à prendre avant de coder

Le plan recommande un premier lancement sans texte intégré au logo. Les modèles image rendent mieux un symbole simple et centré qu’un nom de marque lisible en très petit. MIA pourra néanmoins créer un monogramme, par exemple une lettre ou deux initiales, si la personne le demande.

## Références

[1] [Cloudflare — FLUX.1 schnell](https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/)

[2] [Cloudflare — tarification Workers AI](https://developers.cloudflare.com/workers-ai/platform/pricing/)
