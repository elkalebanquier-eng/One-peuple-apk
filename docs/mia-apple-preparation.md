# Préparer une future sortie IPA Apple

MIA💻 ne lance aucune compilation IPA tant qu’un parcours de signature Apple officiel n’est pas configuré. Une IPA publiable ne correspond pas à une APK Android : elle doit être archivée sur macOS avec Xcode, puis signée au moyen d’un certificat de distribution et d’un profil de provisionnement liés à l’identifiant de l’application.

La préparation à demander avant toute future activation est la suivante : un compte Apple Developer du propriétaire, un identifiant d’application iOS, un certificat de distribution, un profil de provisionnement App Store, ainsi qu’un environnement macOS/Xcode sécurisé. Pour envoyer une version à Apple, l’archive doit ensuite être chargée dans App Store Connect ; le système ne doit jamais placer les certificats, profils, mots de passe ou clés privées dans MIA💻, le code source, les journaux ou un ZIP importé.

> Tant que ces éléments ne sont pas disponibles et contrôlés dans un environnement de signature isolé, l’option « IPA Apple » reste verrouillée et ne crée aucun build ni aucune consommation de quota.

## Données à préparer dans MIA💻

Le formulaire mobile peut conserver sur l’appareil l’identifiant d’application iOS au format DNS inversé, l’identifiant d’équipe Apple, le nom non secret du certificat de distribution, le nom du profil App Store Connect, la version et le numéro de build. L’identifiant d’application doit correspondre entre le projet, l’enregistrement App Store Connect et le profil de provisionnement. Apple indique également qu’un profil App Store Connect associe un seul certificat de distribution à un App ID explicite.

MIA💻 ne doit jamais demander, recevoir ou conserver un certificat exporté `.p12`, un profil `.mobileprovision`, une clé privée, une clé API `.p8`, un mot de passe ou un code à usage unique. Ces éléments ne pourront être ajoutés qu’à un futur environnement de signature macOS isolé, après une décision explicite du propriétaire.

## État contrôlé du 27 août 2026

Le dépôt MIA💻 ne contient aujourd’hui qu’un workflow Android de génération d’APK debug. Aucun workflow macOS, aucune archive Xcode, aucun certificat de distribution, aucun profil Apple et aucun service isolé de signature ne sont configurés. Le formulaire peut donc préparer les repères, mais l’indicateur de disponibilité IPA demeure explicitement à `false` et aucune demande iOS ne peut être soumise.

Avant d’activer une IPA App Store, il faudra disposer du compte Apple Developer du propriétaire, d’un App ID explicite enregistré, d’un certificat Apple Distribution et d’un profil App Store Connect qui lui est associé. Apple indique que le profil App Store Connect contient un seul certificat de distribution et que ce certificat permet l’envoi à App Store Connect. La signature devra se faire uniquement dans une machine macOS isolée, avec les éléments privés remis directement à son coffre de signature ; ils ne passeront jamais par l’APK, MIA💻, GitHub, un ZIP importé ou les journaux.

## Sources officielles

- Apple Developer, [Certificates overview](https://developer.apple.com/help/account/certificates/certificates-overview/)
- Apple Developer, [Create an App Store Connect provisioning profile](https://developer.apple.com/help/account/provisioning-profiles/create-an-app-store-provisioning-profile/)
- Apple Developer, [Distributing your app for beta testing and releases](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases)
