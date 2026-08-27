# Validation AAB Google Play — MIA💻

Dernière vérification : 27 août 2026.

## Ce que MIA💻 peut garantir avant l’envoi

MIA💻 produit un fichier **`.aab`**, et non une APK installable. Le worker Android construit le bundle de publication, le publieur isolé le signe avec une clé d’envoi privée créée hors de MIA💻, vérifie la signature et remet le bundle avec sa sauvegarde de clé. Le contrôle de l’archive vérifie également que la structure du bundle contient sa configuration, son manifeste Android et son code compilé.

La clé privée, le fichier JKS et le mot de passe ne doivent pas être déposés dans MIA💻, le ZIP du projet, les journaux ni le dépôt. L’utilisateur doit télécharger et conserver la sauvegarde de clé proposée avec un AAB signé. Pour une mise à jour de la même application Play Store, il faudra réutiliser la même clé d’envoi ou enregistrer une nouvelle clé suivant le parcours autorisé par Google Play.

## Ce que seul Google Play peut confirmer

Un fichier AAB techniquement valide ne devient publiable qu’après son import dans **Google Play Console**. Le propriétaire du compte doit créer la fiche de l’application, activer Play App Signing, compléter les déclarations et passer les contrôles de Google. Google Play utilise l’AAB pour générer les APK optimisées installées sur les appareils ; l’AAB ne se lance jamais directement sur un téléphone.

Pour une nouvelle application, Play App Signing est obligatoire. L’AAB doit être signé par une clé d’envoi protégée ; Google vérifie cette clé puis signe les APK de distribution. Les mises à jour exigent un numéro de version supérieur et une clé d’envoi reconnue par Play Console.

## Verdict de MIA💻

Le choix **AAB Play Store** est adapté à une première importation dans Play Console après sauvegarde de sa clé. MIA💻 ne peut pas confirmer à elle seule l’acceptation finale par Google, car cette dernière dépend du compte Play Console, du package déjà publié, des règles de contenu, des déclarations et des contrôles effectués dans le compte du propriétaire.

## Sources officielles

1. [Android Developers — About Android App Bundles](https://developer.android.com/guide/app-bundle)
2. [Android Developers — Sign your app](https://developer.android.com/studio/publish/app-signing)
3. [Android Developers — Upload your app to the Play Console](https://developer.android.com/studio/publish/upload-bundle)
4. [Google Play Help — Use Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756?hl=en)
