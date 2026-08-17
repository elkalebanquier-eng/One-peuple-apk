# Diagnostic de livraison d’APK

## Vérification réalisée le 17 août 2026

Un projet HTML minimal a été envoyé au moteur One App avec l’identifiant de test `build-diagnose-1786995924-0c050117`.

| Étape | Résultat observé |
|---|---|
| Réception backend | `202` puis statut `queued` |
| Worker GitHub | Exécution `32062146512` terminée avec succès |
| Publication temporaire | Exécution `32062235530` terminée avec succès |
| Statut backend final | `complete` avec une URL APK |
| URL APK GitHub | Réponse HTTP `200`, type `application/vnd.android.package-archive` |

Le moteur et les deux workflows terminent donc correctement une compilation HTML simple. La publication fournit bien une APK directement téléchargeable.

## Fragilité détectée

Le serveur conserve actuellement les enregistrements de compilation dans une `Map` en mémoire. Si le processus du serveur est redémarré pendant une compilation, il oublie le build alors que l’APK pourra ensuite être publiée sur GitHub. Dans ce cas, l’application reçoit un statut « introuvable » et ne connaît pas l’URL de l’APK déjà prête.

## Correction appliquée

Le backend renvoie dès l’acceptation une URL d’APK prévisible, basée sur l’identifiant de build. L’application la conserve localement et la vérifie comme solution de secours si le statut du serveur devient indisponible. La rétention du statut backend correspond désormais aux 48 heures de disponibilité de l’APK temporaire.
