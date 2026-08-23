# Références OAuth pour les connecteurs MIA

## Règles de sécurité retenues

Les connecteurs qui accèdent à un compte externe doivent utiliser l’autorisation officielle du fournisseur dans le navigateur du téléphone. La RFC 8252 recommande l’agent utilisateur externe pour les applications natives, plutôt qu’une WebView intégrée. L’application ne doit donc ni voir ni enregistrer les cookies ou le mot de passe du navigateur.

GitHub recommande une GitHub App pour les accès limités dépôt par dépôt et les jetons courts. Le relais sécurisé doit conserver les secrets de l’application GitHub et effectuer l’échange d’un code OAuth ; l’APK ne reçoit jamais le secret client ni un jeton longue durée. L’utilisateur doit recevoir une demande d’autorisation, choisir les dépôts et pouvoir retirer l’accès.

Google utilise également OAuth 2.0. Les permissions doivent être demandées au moment où une fonction en a besoin et non toutes au départ. Un jeton d’accès est limité aux scopes accordés ; un éventuel jeton de rafraîchissement doit rester dans un stockage serveur sécurisé.

## Conséquence pour MIA

Le centre de connecteurs peut afficher tous les services et guider leur préparation dès maintenant. Un service ne devient « connecté » que lorsqu’un relais OAuth est effectivement configuré avec les identifiants du fournisseur et que l’utilisateur a validé son autorisation officielle.

## Sources

- [RFC 8252 — OAuth 2.0 for Native Apps](https://datatracker.ietf.org/doc/html/rfc8252)
- [GitHub — Authorizing OAuth apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [Google — Using OAuth 2.0 to Access Google APIs](https://developers.google.com/identity/protocols/oauth2)
