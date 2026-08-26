# Préparer une future sortie IPA Apple

MIA💻 ne lance aucune compilation IPA tant qu’un parcours de signature Apple officiel n’est pas configuré. Une IPA publiable ne correspond pas à une APK Android : elle doit être archivée sur macOS avec Xcode, puis signée au moyen d’un certificat de distribution et d’un profil de provisionnement liés à l’identifiant de l’application.

La préparation à demander avant toute future activation est la suivante : un compte Apple Developer du propriétaire, un identifiant d’application iOS, un certificat de distribution, un profil de provisionnement App Store, ainsi qu’un environnement macOS/Xcode sécurisé. Pour envoyer une version à Apple, l’archive doit ensuite être chargée dans App Store Connect ; le système ne doit jamais placer les certificats, profils, mots de passe ou clés privées dans MIA💻, le code source, les journaux ou un ZIP importé.

> Tant que ces éléments ne sont pas disponibles et contrôlés dans un environnement de signature isolé, l’option « IPA Apple » reste verrouillée et ne crée aucun build ni aucune consommation de quota.

## Sources officielles

- Apple Developer, [Create an App Store Connect provisioning profile](https://developer.apple.com/help/account/provisioning-profiles/create-an-app-store-provisioning-profile/)
- Apple Developer, [Preparing your app for distribution](https://developer.apple.com/documentation/xcode/preparing-your-app-for-distribution)
- Apple Developer, [Upload builds to App Store Connect](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/)
