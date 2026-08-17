# Notes d’intégration Cloudflare Workers AI

One App utilise un **Cloudflare Worker** nommé `one-app-ai` comme relais interne. Ce Worker possède une liaison `AI` et appelle `@cf/meta/llama-3.1-8b-fast-v2`, modèle testé avec succès sur le compte connecté. Ainsi, l’APK ne contient ni jeton Cloudflare ni identifiant sensible.

Le relais accepte seulement `POST /api/code`, une demande courte, le type de projet (`html`, `expo` ou `android`) et, si besoin, un extrait de code à corriger. Il limite chaque client à **20 demandes par heure**, réduit les tailles de texte et renvoie des messages simples en français. L’accès via navigateur a été supprimé : l’usage prévu est l’application native One App.

La documentation Cloudflare indique une allocation gratuite de **10 000 Neurons par jour**, remise à zéro à `00:00 UTC`. Après cette limite, les requêtes échouent sur le plan gratuit ; l’application doit donc conserver les limites de taille et de fréquence avant tout appel.

La page produit officielle Workers AI indique explicitement : **« Start building for free — no credit card required. »** Workers AI peut donc être utilisé avec l’allocation gratuite, sans carte bancaire. Le relais privilégie des réponses courtes afin de préserver cette allocation.

## Sources

- https://developers.cloudflare.com/workers-ai/get-started/rest-api/
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://www.cloudflare.com/products/workers-ai/

## État validé le 17 août 2026

- Le Worker `one-app-ai` est déployé et son adresse technique Workers.dev est activée.
- La liaison Workers AI `AI` est active dans le Worker.
- Une demande HTML de test a renvoyé directement un fichier HTML utilisable.
- Aucun jeton API ne doit être ajouté dans One App.
