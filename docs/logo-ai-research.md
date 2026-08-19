# Recherche — génération de logo IA pour MIA

La documentation Cloudflare Workers AI décrit le modèle `@cf/black-forest-labs/flux-1-schnell` comme un modèle de génération d’images à partir d’une description textuelle. Il renvoie l’image en Base64, ce qui permet au relais MIA de renvoyer une image directement à One App sans exposer de clé dans l’application.

Le modèle accepte un prompt de 1 à 2 048 caractères et propose de 4 à 8 étapes de diffusion. Pour une icône d’application, une sortie carrée de 512 × 512 et 4 étapes constitue le point de départ à privilégier : elle est légère, rapide et adaptée à la réduction Android ultérieure.

Cloudflare indique une allocation gratuite de 10 000 Neurons par jour, remise à zéro à 00:00 UTC. La tarification publiée pour FLUX.1 schnell est de 4,80 Neurons par tuile 512 × 512 et 9,60 Neurons par étape. Le relais devra donc imposer une limite spécifique de générations de logo par heure afin de préserver l’allocation partagée avec MIA.

## Sources

- https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/workers-ai/guides/tutorials/image-generation-playground/image-generator-flux/
