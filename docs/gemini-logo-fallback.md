# Secours Gemini pour le logo MIA

Le test de production du modèle image Cloudflare `@cf/black-forest-labs/flux-1-schnell` a renvoyé HTTP 503 le 19 août 2026. Le diagnostic de compilation Cloudflare répond correctement ; seule la génération d’image doit avoir un secours.

La documentation officielle Gemini indique que la génération d’image native « Nano Banana » est disponible via l’API Gemini. Le modèle stable retenu pour le secours est `gemini-3.1-flash-lite-image`, adapté à une image de logo carrée simple et à un coût/temps réduit. L’API REST documentée utilise `POST https://generativelanguage.googleapis.com/v1beta/interactions` avec la clé uniquement côté serveur, et renvoie l’image en Base64 dans `output_image.data`.

La requête REST doit transmettre `input` sous la forme `[{"type":"text","text":"..."}]`, sans `response_modalities`. L’API retourne l’image Base64 dans `output_image.data`.[1]

Le 19 août 2026, l’API Gemini a confirmé que les modèles image sont visibles avec la clé connectée, mais que leur quota gratuit de requêtes est fixé à zéro pour ce projet (`generate_content_free_tier_requests`, modèle image). Le relais conserve donc le secours Gemini et retourne une explication simple en cas de quota nul ; il ne prétend pas produire un logo lorsque Gemini ne peut pas le faire. L’utilisateur peut toujours utiliser l’icône personnalisée existante depuis son téléphone. Cette information provient de la réponse officielle de l’API Gemini au test de génération, sans être exposée à l’utilisateur.[1]

Le relais KIA doit donc exposer une route serveur protégée qui :

1. applique le plafond local de logos par téléphone ;
2. génère une icône carrée sans texte fin, sans marque existante et sans filigrane demandé ;
3. appelle Gemini avec la clé serveur `GEMINI_API_KEY` ;
4. retourne exclusivement l’image Base64 et son type MIME au téléphone, dans le même contrat que MIA ;
5. laisse l’application stocker localement le logo validé et l’utiliser dans la compilation existante.

## Sources

- https://ai.google.dev/gemini-api/docs/image-generation
- https://ai.google.dev/gemini-api/docs/models
