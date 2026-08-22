# Sources officielles — préparation de KIA

Consulté le 22 août 2026.

Google indique que les requêtes Gemini doivent être authentifiées par une clé API. Les clés créées dans Google AI Studio sont désormais des clés d’autorisation liées à un compte de service et les clés standard non restreintes sont rejetées ; Google annonce le rejet complet des clés standard à partir de septembre 2026. La page recommande de conserver la clé dans une variable d’environnement ou un gestionnaire de secrets, de ne jamais la committer dans Git et de ne jamais l’exposer dans une application mobile ou web côté client. Pour une application cliente, Google recommande un proxy serveur qui effectue l’appel API réel.

L’API Gemini expose notamment l’endpoint `POST https://generativelanguage.googleapis.com/v1beta/interactions` avec l’en-tête `x-goog-api-key`, ainsi que l’endpoint `POST https://generativelanguage.googleapis.com/v1beta/{model=models/*}:generateContent`. Les réponses de génération peuvent inclure des informations de sécurité et d’usage.

Sources :

1. https://ai.google.dev/gemini-api/docs/api-key
2. https://ai.google.dev/gemini-api/docs
3. https://ai.google.dev/api/generate-content

## Quotas et coût pour un usage personnel

La documentation tarifaire de Google indique que le palier gratuit est destiné aux développeurs et petits projets, avec accès limité à certains modèles et des jetons d’entrée et de sortie gratuits. Les limites peuvent évoluer et doivent être contrôlées dans Google AI Studio.

Les limites Gemini sont mesurées notamment en requêtes par minute, jetons par minute et requêtes par jour. Elles sont associées au projet, non à la clé individuelle, et les demandes trop fréquentes reçoivent une réponse `429 RESOURCE_EXHAUSTED`.

Le palier payant nécessite une configuration de facturation ; Google indique actuellement un prépaiement minimal de 10 USD (ou équivalent) dans les cas où ce parcours est proposé. Ce n’est pas nécessaire pour commencer avec les modèles disponibles dans le palier gratuit.

Sources :

4. https://ai.google.dev/gemini-api/docs/pricing
5. https://ai.google.dev/gemini-api/docs/billing
6. https://ai.google.dev/gemini-api/docs/rate-limits
