# Identité de compilation de MIA💻

## Décision vérifiée

La compilation des APK n’utilise pas le jeton personnel GitHub nommé « apk-builder ». Le workflow `one-app-build-worker` demande une identité OIDC temporaire à GitHub Actions à chaque passage. Cette identité est utilisée seulement pour récupérer un projet en attente auprès du relais `mia-build-relay`.

Le relais vérifie la signature GitHub, l’audience `one-app-build-worker`, le dépôt `elkalebanquier-eng/one-app-build-worker`, la branche `main`, le workflow précis, l’évènement attendu et la date d’expiration. Une requête dépourvue d’identité valide est refusée avec HTTP 401.

> L’expiration du jeton personnel « apk-builder » ne bloque donc pas la création d’une APK par MIA💻. Le service peut toutefois rester soumis à des causes extérieures, telles qu’une indisponibilité de GitHub Actions, une limite de service ou une erreur dans le projet envoyé.

## Vérification du 25 août 2026

Les trois derniers passages programmés du worker de compilation disponibles au moment du contrôle étaient terminés avec succès. Le connecteur GitHub affiché dans MIA💻 reste un parcours séparé : il est fermé et ne participe pas au mécanisme de compilation.
