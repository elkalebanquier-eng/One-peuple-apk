# Modèle Cloudflare spécialisé code pour MIA💻

MIA💻 utilise déjà un relais Cloudflare avec une liaison IA côté serveur. Pour renforcer les réponses de code sans placer de clé dans l’APK et sans réactiver KIA, Gemini ou Claude, le modèle candidat est `@cf/qwen/qwen2.5-coder-32b-instruct`.

Cloudflare décrit Qwen2.5-Coder comme une série spécialisée pour le code. La fiche officielle indique une fenêtre de contexte de 32 768 jetons, l’appel par `env.AI.run(...)`, et la prise en charge des messages ainsi que des réglages de génération. La tarification indiquée par Cloudflare est de 0,66 USD par million de jetons en entrée et 1,00 USD par million de jetons en sortie ; la disponibilité et la facturation effectives restent celles du compte Cloudflare de l’utilisateur.

La migration doit conserver les limites de requêtes, le découpage du contexte, la validation des réponses et l’interdiction de toute clé, session ou donnée de signature dans l’application mobile. Les propositions de correction restent à confirmer explicitement : elles ne modifient jamais le code sans accord.

## Référence

[1] [Cloudflare, « qwen2.5-coder-32b-instruct »](https://developers.cloudflare.com/workers-ai/models/qwen2.5-coder-32b-instruct/)
