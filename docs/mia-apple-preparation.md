# Préparer une future sortie IPA Apple

MIA💻 ne lance aucune compilation IPA tant qu’un parcours de signature Apple officiel n’est pas configuré. Une IPA publiable ne correspond pas à une APK Android : elle doit être archivée sur macOS avec Xcode, puis signée au moyen d’un certificat de distribution et d’un profil de provisionnement liés à l’identifiant de l’application.

La préparation à demander avant toute future activation est la suivante : un compte Apple Developer du propriétaire, un identifiant d’application iOS, un certificat de distribution, un profil de provisionnement App Store, ainsi qu’un environnement macOS/Xcode sécurisé. Pour envoyer une version à Apple, l’archive doit ensuite être chargée dans App Store Connect ; le système ne doit jamais placer les certificats, profils, mots de passe ou clés privées dans MIA💻, le code source, les journaux ou un ZIP importé.

> Tant que ces éléments ne sont pas disponibles et contrôlés dans un environnement de signature isolé, l’option « IPA Apple » reste verrouillée et ne crée aucun build ni aucune consommation de quota.

## Données à préparer dans MIA💻

Le formulaire mobile peut conserver sur l’appareil l’identifiant d’application iOS au format DNS inversé, l’identifiant d’équipe Apple, le nom non secret du certificat de distribution, le nom du profil App Store Connect, la version et le numéro de build. L’identifiant d’application doit correspondre entre le projet, l’enregistrement App Store Connect et le profil de provisionnement. Apple indique également qu’un profil App Store Connect associe un seul certificat de distribution à un App ID explicite.

MIA💻 ne doit jamais demander, recevoir ou conserver un certificat exporté `.p12`, un profil `.mobileprovision`, une clé privée, une clé API `.p8`, un mot de passe ou un code à usage unique. Ces éléments ne pourront être ajoutés qu’à un futur environnement de signature macOS isolé, après une décision explicite du propriétaire.

## Parcours officiel vers un build App Store valide

Un titulaire de compte ou un administrateur de l’Apple Developer Program doit effectuer les étapes suivantes dans les portails Apple. Ces rôles sont ceux qui peuvent créer un certificat de distribution et un profil de distribution.[1] [2]

| Étape | Action à réaliser | Repère possible dans MIA💻 | Élément qui ne passe jamais dans MIA💻 |
|---|---|---|---|
| 1 | Dans **Certificates, Identifiers & Profiles**, créer un App ID explicite. Son Bundle ID doit être exactement le même que celui du projet iOS. | Bundle ID iOS et Team ID | Compte Apple, session et identifiants |
| 2 | Depuis un Mac, générer une demande de signature (CSR), puis créer un certificat **Apple Distribution**. | Nom du certificat | Clé privée, certificat exporté `.p12` et mot de passe |
| 3 | Créer un profil **App Store Connect** de distribution, choisir l’App ID puis le certificat Apple Distribution, générer et télécharger le profil. | Nom du profil | Fichier `.mobileprovision` |
| 4 | Dans App Store Connect, créer le dossier de l’app avec le même Bundle ID et prévoir un numéro de version ainsi qu’un numéro de build unique. | Version et numéro de build | Session App Store Connect ou clé API |
| 5 | Sur une machine macOS avec Xcode, archiver l’application, signer l’archive dans un coffre sécurisé, puis l’envoyer à App Store Connect avec Xcode ou Transporter.[3] | État « prêt à signer » | IPA non signée, certificat, profil, clé privée et mots de passe |

> **Important :** le Bundle ID iOS est distinct du package Android. Il doit correspondre à l’App ID Apple et au projet iOS, mais il ne change jamais le package Android `com.oneapp.builder`.

Apple indique qu’un profil App Store Connect associe un App ID explicite et un seul certificat de distribution.[2] Apple conseille également de ne pas partager les certificats de distribution en dehors de l’organisation.[1] Pour cette raison, ces fichiers doivent être déposés directement dans le coffre d’un futur service macOS isolé par leur propriétaire — jamais dans l’APK, le dépôt, MIA💻, un ZIP importé, un message ou les journaux.

## État contrôlé du 27 août 2026

Le dépôt MIA💻 ne contient aujourd’hui qu’un workflow Android de génération d’APK debug. Aucun workflow macOS, aucune archive Xcode, aucun certificat de distribution, aucun profil Apple et aucun service isolé de signature ne sont configurés. Le formulaire peut donc préparer les repères, mais l’indicateur de disponibilité IPA demeure explicitement à `false` et aucune demande iOS ne peut être soumise.

Avant d’activer une IPA App Store, il faudra disposer du compte Apple Developer du propriétaire, d’un App ID explicite enregistré, d’un certificat Apple Distribution et d’un profil App Store Connect qui lui est associé. Apple indique que le profil App Store Connect contient un seul certificat de distribution et que ce certificat permet l’envoi à App Store Connect. La signature devra se faire uniquement dans une machine macOS isolée, avec les éléments privés remis directement à son coffre de signature ; ils ne passeront jamais par l’APK, MIA💻, GitHub, un ZIP importé ou les journaux.

## Sources officielles

[1] Apple Developer, [Certificates overview](https://developer.apple.com/help/account/certificates/certificates-overview/)

[2] Apple Developer, [Create an App Store Connect provisioning profile](https://developer.apple.com/help/account/provisioning-profiles/create-an-app-store-provisioning-profile/)

[3] App Store Connect Help, [Upload builds](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/)
