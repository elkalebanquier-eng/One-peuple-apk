# Référence GitHub pour le connecteur MIA💻

Cette note conserve les éléments officiels utilisés pour concevoir une future connexion GitHub sans mot de passe ni jeton dans l’APK.

GitHub recommande d’envisager une GitHub App plutôt qu’une OAuth App pour une intégration qui accède à des dépôts : les permissions peuvent être précises, l’utilisateur contrôle les dépôts accessibles et les jetons peuvent être de courte durée. Une OAuth App peut toutefois utiliser le flux web OAuth 2.0 ou le flux d’appareil pour autoriser un utilisateur.

Pour le flux web, l’application ouvre l’autorisation GitHub, reçoit un code temporaire au retour, puis l’échange côté service sécurisé contre un jeton. GitHub recommande l’utilisation d’un paramètre d’état et de PKCE. Le `client_secret` ne doit donc jamais être intégré dans l’APK ; il doit rester uniquement dans le relais sécurisé. L’autorisation dans MIA doit rester une confirmation volontaire avant ouverture de GitHub.

La fenêtre mobile de MIA doit, dans un premier temps, présenter ces règles et les permissions minimales. Une connexion réelle nécessite ensuite l’enregistrement d’une GitHub App ou OAuth App avec une URL de retour contrôlée par le relais sécurisé.

## Sources

- [Autoriser les OAuth Apps — GitHub Docs](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow)
- [Créer une OAuth App — GitHub Docs](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)
