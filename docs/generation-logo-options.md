# Options de génération de logo pour MIA💻

## Constats vérifiés le 23 août 2026

Cloudflare Workers AI propose des modèles de génération et d’édition d’images accessibles depuis un Worker. Cette route convient à MIA💻 car la clé ou la liaison Cloudflare reste côté relais, jamais dans l’APK. Source : [Workers AI Models](https://developers.cloudflare.com/workers-ai/models/) et [guide de génération d’images](https://developers.cloudflare.com/workers-ai/guides/tutorials/image-generation-playground/image-generator-flux/).

Google propose aussi une génération d’images via ses services Gemini, mais la clé d’accès doit rester côté serveur. Elle ne doit pas être intégrée à l’application mobile. Source : [documentation d’authentification Gemini](https://ai.google.dev/gemini-api/docs/api-key).

Hugging Face expose des fournisseurs d’inférence pour l’image, mais requiert également une authentification ou une offre de fournisseur. Source : [Text to Image](https://huggingface.co/docs/inference-providers/en/tasks/text-to-image).

## Choix de produit provisoire

La première option à privilégier est une génération via le relais Cloudflare déjà utilisé par MIA : elle respecte la séparation entre l’APK et les secrets. Un générateur local de logos géométriques simples servira de solution de secours lorsque le service de génération n’est pas configuré ; il ne sera jamais présenté comme une IA.

La route existante repose sur `@cf/black-forest-labs/flux-1-schnell`. Cloudflare documente que ce modèle accepte un prompt texte et retourne l’image en Base64, ce qui correspond au contrat local déjà validé par MIA. Le résultat est ensuite écrit dans l’espace privé du téléphone.

| Voie | Secret dans l’APK | Usage dans MIA | Décision |
| --- | --- | --- | --- |
| Relais Cloudflare Workers AI + Flux | Non : le relais est le seul à communiquer avec le fournisseur. | Brief confirmé, image locale, limite de trois logos par heure. | **Voie retenue.** |
| Créateur local de formes/couleurs | Non, et aucun réseau. | Crée un modèle géométrique ; ce n’est pas une IA. | Secours possible, clairement étiqueté. |
| Hugging Face Inference Providers | Interdit : le service attend un jeton d’inférence dans l’autorisation. | Demanderait un relais distinct et une gestion de coûts. | À ne pas intégrer sans infrastructure sécurisée. |
| Génération Gemini | Interdit : une clé d’accès est nécessaire. | KIA/Gemini demeure désactivé. | À ne pas activer dans cette version. |

## Parcours conversationnel retenu

Le menu **Outils** crée une carte de brief directement dans le fil de MIA, sans ouvrir un formulaire isolé. La carte demande un nom, une description et deux couleurs facultatives. Son bouton explique que le brief est envoyé au relais IA et ouvre une confirmation native. Aucun appel réseau n’est fait avant cette confirmation.

Après création, MIA ajoute un message assistant persistant contenant l’aperçu local, l’origine « IA Cloudflare », et les actions **Utiliser comme icône**, **Régénérer** et **Préparer l’APK**. Le schéma des conversations est étendu pour conserver uniquement le chemin local de l’image, les métadonnées non sensibles et le brief ; il ne conserve ni clé, ni jeton, ni donnée de session.

## Règles de sécurité

- Aucun jeton, mot de passe ou clé d’IA ne doit être ajouté à l’APK ou au dépôt.
- La demande doit être confirmée avant l’envoi du brief de logo au relais.
- La conversation doit préciser si le résultat vient du générateur local ou du service de génération distant.
- Les coûts et limites éventuels doivent être affichés avant toute activation du service distant.

## Références

- [FLUX.1 schnell — Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/)
- [Text to Image — Hugging Face Inference Providers](https://huggingface.co/docs/inference-providers/en/tasks/text-to-image)
- [Gemini API](https://ai.google.dev/gemini-api/docs)
