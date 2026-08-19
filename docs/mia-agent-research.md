# Recherche — autorisations du mode Agent MIA💻

## Principe retenu

Un mode Agent peut utiliser une API, une IA ou une base de données, mais uniquement après une autorisation explicite de la personne. L’application mobile ne doit jamais contenir le mot de passe d’un service ni un secret serveur : une application installée sur un téléphone ne peut pas protéger un secret durablement.[1]

## Conséquences pour MIA💻

| Règle | Application dans MIA💻 |
|---|---|
| Connexion par autorisation | L’utilisateur ouvre la connexion officielle du service, choisit les droits demandés, puis revient dans MIA💻. |
| Droits réduits | Chaque connecteur demande seulement les droits nécessaires : par exemple lire une base de données, sans droit de suppression. |
| Secrets hors APK | Les jetons sont conservés uniquement dans un relais serveur sécurisé ou dans le stockage chiffré local prévu pour le téléphone. |
| Opération sensible confirmée | Avant l’envoi d’un message, la publication, la suppression, le paiement ou une écriture dans une base, MIA💻 affiche le détail et attend une confirmation. |
| Journal local | L’application affiche les actions, l’heure, le service appelé et le résultat ; la personne peut révoquer le connecteur. |

## Limites à annoncer honnêtement

Le mode Agent ne doit pas recevoir un accès global au téléphone ni décider seul d’opérations sensibles. Il peut préparer une action, expliquer ce qu’il va faire, exécuter une action déjà autorisée et présenter le résultat. Les tâches longues ou nécessitant une surveillance continue exigent un service serveur explicitement configuré ; elles ne doivent pas tourner discrètement dans l’APK.

## Sources

[1] [Google for Developers — OAuth 2.0 for installed apps](https://developers.google.com/identity/protocols/oauth2/native-app)
