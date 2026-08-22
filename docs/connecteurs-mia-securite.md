# Connecteurs MIA💻 — décisions de sécurité

## Objectif de l’écran

MIA💻 peut présenter un écran **Connecteurs** similaire à l’interface demandée : GitHub, Cloudflare, Gemini et Navigateur. Cet écran doit séparer un simple indicateur d’état d’une connexion réellement autorisée. Aucun mot de passe, cookie, jeton ou donnée de session ne doit être affiché ni inscrit dans l’APK.

## GitHub

Une connexion GitHub réelle doit utiliser une autorisation officielle dans le navigateur du téléphone. Une GitHub App est préférable à une OAuth App générale : elle peut limiter l’autorisation à certains dépôts, demander des permissions fines et utiliser des jetons courts. L’APK ne doit jamais contenir de secret d’application ; l’échange d’autorisation et la conservation éventuelle du jeton doivent rester dans un service serveur contrôlé.

## Navigateur

MIA💻 ne peut pas lire ou contrôler les sessions déjà ouvertes dans Chrome, Brave ou un autre navigateur, ni reprendre leurs cookies. Une future connexion peut uniquement ouvrir une page officielle d’autorisation, puis revenir vers MIA après l’accord explicite de l’utilisateur.

## Services MIA actuels

L’écran peut afficher les états GitHub, Cloudflare et Gemini déjà connus par MIA sans révéler de clé. GitHub et Cloudflare sont l’infrastructure personnelle de compilation ; Gemini/KIA reste désactivé tant qu’une configuration serveur sûre n’a pas été activée.

## Références officielles

1. GitHub recommande les GitHub Apps car elles proposent des permissions fines, le choix des dépôts et des jetons courts : https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps
2. L’autorisation OAuth de GitHub peut ouvrir une page officielle puis rediriger vers l’application, et doit vérifier l’état de retour : https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
3. Les jetons personnels doivent être traités comme des mots de passe ; GitHub recommande des permissions fines lorsque c’est possible : https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
