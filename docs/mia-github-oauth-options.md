# Activation GitHub pour MIA💻 — décision d’architecture

## Exigences officielles vérifiées

GitHub prend en charge le flux OAuth d’autorisation par code et le flux par code d’appareil. Pour un parcours avec navigateur, l’application redirige l’utilisateur vers GitHub, reçoit un code temporaire et l’échange côté serveur. Le paramètre `state` doit être vérifié et le retour (`redirect_uri`) doit correspondre à l’URL prévue. GitHub prend en charge et recommande PKCE avec la méthode `S256` : le `code_verifier` doit accompagner l’échange du code. Le secret client doit rester uniquement sur le relais HTTPS, jamais dans l’APK.

Les applications OAuth GitHub se créent dans les réglages développeur GitHub avec un nom, une URL d’accueil et une URL de retour. GitHub permet plusieurs URLs de retour et active par défaut les jetons à durée limitée. Le flux par code d’appareil doit être activé explicitement dans les réglages de l’application OAuth.

## Options proposées

| Option | Parcours sur téléphone | Atout principal | Limite |
|---|---|---|---|
| Navigateur + relais HTTPS + retour MIA | « Connecter » → confirmation MIA → navigateur GitHub → retour automatique dans MIA | Le plus simple et le plus proche de l’expérience attendue | Nécessite un relais HTTPS et une application OAuth enregistrée |
| Code d’appareil GitHub | MIA affiche un code → navigateur GitHub → saisie/confirmation → retour dans MIA | Pas de redirection de navigateur vers une URL de retour | Plus d’étapes et attente de confirmation par code |
| Application GitHub à permissions fines | L’utilisateur installe/autorise l’application GitHub | Permissions par dépôt plus précises | Mise en place et gestion plus complexes pour un premier connecteur personnel |

## Choix recommandé pour MIA💻

Le premier choix recommandé est le parcours **navigateur + relais HTTPS + retour dans MIA**, avec PKCE, `state` signé à usage unique, permissions minimales et une confirmation sombre avant toute ouverture du navigateur. Le relais garde le secret client, valide le retour GitHub, puis revient vers le lien profond de MIA sans transmettre de jeton dans l’URL.

## Relais de compilation APK — vérification du 25 août 2026

Le relais `mia-build-relay` ne contient pas et ne demande pas de jeton d’accès personnel GitHub. Sa seule valeur secrète est une clé interne entre le Worker et son stockage temporaire. Le workflow de compilation `one-app-build-worker` s’authentifie auprès du relais avec une identité OIDC fournie automatiquement à chaque exécution par GitHub Actions. Le relais vérifie la signature, le dépôt, la branche, le workflow, l’évènement et l’expiration de cette identité.

Le jeton personnel nommé « apk-builder » signalé par GitHub n’est donc pas requis par le parcours de compilation de MIA💻 tel qu’il est déployé aujourd’hui. Il ne faut pas le remplacer par un jeton personnel sans expiration. Une GitHub App peut générer des jetons d’installation renouvelables et limités au dépôt si une future fonction serveur doit appeler l’API GitHub ; ces jetons expirent volontairement après une heure et sont recréés côté serveur, jamais placés dans l’APK.

## Sources

1. GitHub Docs, « Authorizing OAuth apps » : https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
2. GitHub Docs, « Creating an OAuth app » : https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app
3. GitHub Changelog, « PKCE support for OAuth and GitHub App authentication » : https://github.blog/changelog/2025-07-14-pkce-support-for-oauth-and-github-app-authentication/
4. GitHub Docs, « Authenticating as a GitHub App installation » : https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation
5. GitHub Docs, « Choosing permissions for a GitHub App » : https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app
