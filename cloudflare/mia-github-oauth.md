# Relais GitHub OAuth de MIA💻

Ce Worker est préparé mais **ne doit pas être déployé avec des valeurs fictives**. Il n’est activé qu’après la création de l’application OAuth GitHub par son propriétaire.

Le Worker utilise uniquement le périmètre `read:user`. Après le retour GitHub, il vérifie le profil autorisé puis supprime le jeton d’accès reçu. Il ne renvoie jamais ce jeton vers MIA💻 et ne le stocke ni dans l’APK, ni dans le dépôt, ni dans le KV.

| Liaison Cloudflare | Type | Rôle |
|---|---|---|
| `OAUTH_STATES` | KV Namespace | États PKCE et résultats temporaires, supprimés après lecture ou expiration |
| `GITHUB_CLIENT_ID` | Texte secret | Identifiant de l’application OAuth GitHub |
| `GITHUB_CLIENT_SECRET` | Texte secret | Secret utilisé uniquement pour l’échange du code sur le Worker |

L’URL de retour à enregistrer dans GitHub est `https://mia-github-oauth.oneapp-kikokalok.workers.dev/callback`. Le retour vers MIA utilise le lien profond `manusbuilder://oauth/callback` et ne contient aucun jeton GitHub.

