# Activer KIA de manière sécurisée

**But :** permettre à KIA d’utiliser Gemini dans MIA💻 sans jamais placer la clé Gemini dans l’APK, dans le code GitHub ou dans les fichiers du téléphone.

## Principe à respecter

> La clé Gemini reste exclusivement dans le secret du service Cloudflare. MIA💻 envoie seulement le message de l’utilisateur au service sécurisé ; le service appelle Gemini, puis retourne une réponse sans clé.

Cette séparation est indispensable : une APK peut être copiée, inspectée ou modifiée. Une clé écrite dans l’APK pourrait être récupérée et utilisée par quelqu’un d’autre. Le service Cloudflare `one-app-ai-worker` existe déjà pour MIA ; KIA doit emprunter le même principe, avec une route séparée et une limite de requêtes.

| Élément | Rôle | La clé Gemini y est-elle autorisée ? |
|---|---|---|
| MIA💻 installée sur votre téléphone | Affiche KIA et transmet votre question. | **Non** |
| Dépôt GitHub | Garde le code versionné. | **Non** |
| Service Cloudflare `one-app-ai-worker` | Vérifie la demande, limite les abus et appelle Gemini. | **Oui, uniquement comme secret** |
| Google AI Studio | Crée la clé Gemini et affiche l’utilisation. | **Oui, dans votre compte Google** |

## Étape 1 — Créer une clé Gemini gratuite depuis le téléphone

Ouvrez **Google AI Studio**, connectez-vous avec votre compte Google, puis ouvrez **API keys**. Créez ou choisissez un projet, puis demandez une nouvelle clé Gemini. Copiez-la une seule fois et ne l’envoyez jamais dans une discussion, une capture d’écran, un fichier ZIP ou un dépôt GitHub.

Le palier gratuit est prévu pour les développeurs et petits projets, avec un accès limité à certains modèles et des quotas variables. Les limites sont définies par projet et peuvent concerner les requêtes par minute, les jetons par minute et les requêtes par jour. Consultez toujours l’écran **Usage** ou **Rate limits** d’AI Studio avant l’activation. [1] [2] [3]

> Pour votre usage personnel, choisissez d’abord un modèle léger disponible dans le palier gratuit. N’activez ni recherche Google, ni outils externes, ni génération d’images pour KIA au départ : cela garde le fonctionnement plus simple et prévisible.

## Étape 2 — Enregistrer la clé dans Cloudflare, pas dans MIA💻

Depuis le tableau de bord Cloudflare sur votre téléphone, ouvrez **Workers & Pages**, sélectionnez le service `one-app-ai-worker`, puis ouvrez **Settings** et la section **Variables and Secrets**. Ajoutez un **Secret** nommé exactement `GEMINI_API_KEY`, collez la clé et enregistrez.

Cloudflare masque ensuite sa valeur. Ne créez pas une variable texte normale : choisissez bien le type **Secret**. Si vous remplacez la clé un jour, effacez l’ancienne et créez une nouvelle clé dans AI Studio ; ne tentez pas de réutiliser une clé qui a été envoyée par erreur.

| Vérification | Résultat attendu | En cas de problème |
|---|---|---|
| Nom du secret | `GEMINI_API_KEY` | Vérifiez les majuscules et les underscores. |
| Type | Secret Cloudflare | Supprimez toute variable texte contenant la clé. |
| Emplacement | `one-app-ai-worker` | Ne placez pas la clé dans le relais de compilation. |
| APK et GitHub | Aucun secret visible | Si une clé a été copiée, révoquez-la dans AI Studio et créez-en une autre. |

## Étape 3 — Ajouter KIA au service sécurisé

L’activation technique consiste à ajouter une route KIA, par exemple `/api/kia`, dans `one-app-ai-worker`. Cette route doit accepter uniquement les champs nécessaires : le type de projet, le message, un historique limité et un identifiant de session local. Elle doit ensuite appeler Gemini avec le secret Cloudflare, et jamais accepter une clé envoyée par l’application.

La route doit aussi imposer une limite personnelle, par exemple **10 messages KIA par heure**, une taille maximale de message et une réponse d’erreur simple en français. En cas de réponse `429` de Gemini, KIA doit afficher « KIA a atteint sa limite pour le moment. Réessayez plus tard. » plutôt qu’un message technique. Les limites Google sont susceptibles de changer ; la valeur active se vérifie dans AI Studio. [2]

Voici le comportement attendu, sans exposer le code de la clé :

1. MIA💻 envoie votre question vers `/api/kia`.
2. Le Worker vérifie la taille, la limite horaire et le format de la demande.
3. Le Worker appelle Gemini avec `GEMINI_API_KEY` stocké comme Secret.
4. Le Worker renvoie le texte de KIA à MIA💻.
5. L’APK conserve uniquement la conversation locale, jamais la clé.

## Étape 4 — Tester avant de rendre KIA visible

Avant d’activer le bouton KIA dans l’APK, effectuez un seul test : envoyez « Écris une fonction JavaScript qui additionne deux nombres ». La réponse doit arriver, sans clé dans la réponse ni dans les journaux du Worker. Vérifiez ensuite dans AI Studio que l’usage a augmenté d’une seule demande.

Si le test échoue, laissez KIA désactivée dans MIA💻 et contrôlez le secret Cloudflare ainsi que le quota AI Studio. Ne contournez pas les limites avec plusieurs clés ou plusieurs comptes : cela rendrait le service fragile et pourrait violer les règles du fournisseur.

## Étape 5 — Activer KIA dans une nouvelle APK

Lorsque le test est réussi, je peux faire la modification finale : ajouter la route KIA sécurisée au Worker, protéger la route par limite de requêtes, remplacer le message « KIA préparée » par un statut actif, tester le parcours puis compiler une nouvelle APK debug. Aucun site à publier et aucun compte GitHub personnel ne seront nécessaires.

## Attention au coût

Le palier gratuit peut suffire à un usage personnel léger, mais Google précise que les modèles, quotas et disponibilités dépendent du projet et peuvent évoluer. Passer au palier payant demande une configuration de facturation ; la documentation actuelle indique notamment un prépaiement minimal de 10 USD dans les cas où ce parcours est proposé. N’activez pas la facturation si vous ne le souhaitez pas : KIA peut rester sur le palier gratuit avec une limite stricte et un message clair lorsque le quota est atteint. [1] [3]

## Ce que vous devez faire maintenant

Créez la clé dans AI Studio et enregistrez-la comme Secret `GEMINI_API_KEY` dans `one-app-ai-worker`. Ensuite, répondez simplement **« clé enregistrée »**. Je vérifierai alors la présence du secret sans afficher sa valeur, je préparerai la route KIA protégée, puis je compilerai une nouvelle APK.

## Références

[1] [Google AI — Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)

[2] [Google AI — Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)

[3] [Google AI — Gemini API billing](https://ai.google.dev/gemini-api/docs/billing)
