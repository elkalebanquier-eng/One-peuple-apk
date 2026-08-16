# Sécurité de la file de compilation One App

Le worker de compilation GitHub ne reçoit pas de jeton personnel, de secret One App ni de droit d’écriture sur un dépôt. À chaque exécution, il obtient un jeton OIDC temporaire auprès de GitHub. Le backend One App vérifie ensuite la signature du jeton ainsi que son émetteur, son audience, le dépôt, la branche et le workflow attendus avant de donner une tâche ou d’accepter un résultat.

Cette approche permet au worker d’accéder uniquement à une tâche de build temporaire. Le ZIP est téléchargé pendant l’exécution, et l’APK est renvoyée vers un lien de dépôt temporaire. Les archives de code ne sont pas commitées dans GitHub.

Pour qu’une APK One App installée puisse compiler, son serveur de build doit rester publié et en ligne. L’adresse publique utilisée par l’APK et par le worker est mise à jour lors de la livraison de la version publiée. Ce n’est pas une donnée secrète ; aucun identifiant GitHub n’est présent dans l’APK.

GitHub indique que les jetons OIDC sont propres à chaque tâche et qu’ils sont destinés à être validés par le service qui fournit la ressource. GitHub documente aussi les revendications `iss`, `aud`, `repository`, `ref`, `workflow_ref` et `event_name`, utilisées par One App pour vérifier le worker.

## Références

1. [GitHub Docs — OpenID Connect reference](https://docs.github.com/actions/reference/openid-connect-reference)
2. [GitHub Docs — Overview of OpenID Connect](https://docs.github.com/en/actions/concepts/security/openid-connect)
