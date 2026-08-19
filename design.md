# MIA💻 — Direction d’interface mobile

## Intention

MIA💻 devient un **atelier de compilation clair et affirmé**, animé par les assistants MIA et KIA, et non une succession de fiches techniques. Dès l’ouverture, la personne comprend une seule chose : elle peut choisir un projet, envoyer son fichier puis récupérer une APK de test. La navigation, les mots et les actions restent adaptés à un écran de téléphone et à une utilisation à une main.

L’interface utilise une identité **noir profond, or et vert**, raccordée à un symbole MIA distinctif : l’or guide l’action, le vert confirme une réussite et le rouge attire l’attention sur une correction. Le design évite les faux réglages et les informations qui ne correspondent pas au fonctionnement réel. Les boutons de téléchargement montrent le nombre d’octets reçus et leur pourcentage réel avant d’ouvrir l’installateur Android.

| Rôle | Couleur | Usage |
|---|---:|---|
| Fond | `#080C0A` | Surface générale de l’application |
| Surface élevée | `#111915` | Zones de contenu et éléments sélectionnables |
| Or One Peuple | `#E6BB47` | Lancer une compilation et action principale |
| Vert résultat | `#79DF61` | APK disponible et fichier reconnu |
| Bleu progression | `#7AA7FF` | Compilation en cours |
| Rouge action requise | `#FF5C72` | Erreur expliquée et action à corriger |

## Écrans et composition

| Écran | Composition retenue | Action prioritaire |
|---|---|---|
| **Mes APK** | En-tête compact « MIA💻 », zone principale de démarrage et liste de builds avec un statut très lisible. L’état vide explique les trois types acceptés en une phrase. | **Créer une APK** |
| **Nouvelle compilation** | Progression 1–2–3 fixe en haut ; choix du type sous forme de trois options larges, puis zone d’import, identité et choix clair entre APK de test et APK signée. | **Choisir le type**, puis **Lancer la compilation** |
| **Résultat dans la liste** | Pastille de statut, message humain, bouton plein format uniquement lorsque l’APK est prête et rappel de la durée de disponibilité. Une APK signée affiche aussi l’action de sauvegarde privée de la clé. | **Télécharger l’APK** |
| **MIA** | Conversation verticale à bulles : l’utilisateur écrit en bas, MIA répond clairement au-dessus. Les suggestions, le choix du type de projet et les actions liées à un code restent larges, lisibles et atteignables au pouce. | **Envoyer un message à MIA** |
| **Mode Agent** | Panneau dans MIA/KIA. Chaque demande est d’abord transformée en une action préparée avec son nom, son effet, les données utilisées et un bouton annuler. | **Confirmer l’action** |
| **Aide** | Guide court « Préparer / Choisir / Télécharger », formats réellement acceptés et avertissement sur les données secrètes. | **Créer une compilation** |
| **Réglages** | Informations utiles uniquement : limite, format de sortie, confidentialité et version. Aucun interrupteur qui ne pilote pas une fonction réelle. | Retourner créer une compilation |

## Flux principal

1. L’utilisateur ouvre **Builds** et touche le grand bouton orange situé dans le bas de la zone de démarrage.
2. Il sélectionne un seul type : **Expo / React Native**, **Android natif** ou **HTML**.
3. La zone d’import se déverrouille et explique le fichier attendu avec des mots simples.
4. Une fois le fichier et le nom renseignés, il touche **Lancer la compilation**.
5. Le build affiche une étape lisible : en attente, compilation, APK prête ou action à corriger.
6. Quand l’APK est prête, le bouton de téléchargement explique qu’elle est destinée aux tests et que le lien est temporaire.
7. Une notification locale « APK prête » apparaît même si l’application est en arrière-plan. Toucher la notification ouvre Mes APK.

## Flux APK signée

1. Après l’identité de l’application, l’utilisateur peut choisir **APK de test** ou **APK signée pour publication**. Le mode de test reste choisi par défaut afin de garder le parcours simple.
2. En mode signé, One App explique en une phrase que la clé est personnelle et qu’elle est indispensable pour publier une mise à jour plus tard.
3. Le code importé est d’abord compilé sans clé. La clé et son mot de passe aléatoire ne sont créés qu’ensuite, dans le publieur de confiance, après l’exécution du code importé.
4. Le publieur signe l’APK, vérifie sa signature, puis remet au moteur une archive privée contenant la clé `.jks`, son alias et son mot de passe.
5. L’application reçoit un jeton de sauvegarde distinct, conservé uniquement sur le téléphone. Elle peut télécharger la clé une seule fois et l’envoyer vers le stockage choisi par l’utilisateur via la feuille de partage Android.
6. La clé, le mot de passe et le jeton ne sont jamais ajoutés à une release publique, au ZIP du projet, aux journaux de compilation ou à l’historique local des builds.

## Flux MIA

1. L’utilisateur ouvre **MIA** et voit un message d’accueil, des idées de demandes rapides et une zone de saisie toujours visible en bas de l’écran.
2. Il décrit son besoin naturellement, par exemple « Je veux une page de connexion » ; MIA répond en français et pose une question courte seulement si le type de code reste indispensable.
3. L’utilisateur choisit HTML, Expo ou Android depuis une feuille compacte. MIA garde le contexte récent sur ce téléphone afin de répondre de façon suivie.
4. Lorsqu’un code est utile, MIA l’affiche dans un message avec les actions **Voir le code**, **Copier** et, pour HTML, **Préparer pour l’APK**.
5. Les conversations restent locales au téléphone. Elles peuvent être rouvertes ou supprimées sans toucher aux builds déjà créés.

## Flux Mode Agent

1. L’utilisateur active **Mode Agent** dans MIA/KIA et formule une demande.
2. L’assistant prépare une action précise, par exemple vérifier le code ou préparer une compilation. Cette action ne démarre pas encore.
3. Une feuille de confirmation affiche l’action, les données utilisées et la conséquence attendue dans des mots simples.
4. L’utilisateur choisit explicitement **Confirmer** ou **Annuler**. Une fermeture de la feuille équivaut à une annulation.
5. Seule une confirmation lance l’action. Le résultat est ajouté à la conversation ; aucun connecteur externe ni donnée secrète ne sont utilisés dans cette première version.

## Règles d’interaction

Les boutons d’action ont une hauteur minimum de 52 px et sont placés en bas des contenus lorsque cela est possible. La sélection de type garde une zone tactile large. Une pression applique seulement une légère baisse d’opacité et une réduction à `0,98`, sans animation spectaculaire.

Les états ne reposent jamais sur la couleur seule : chaque couleur est accompagnée d’un mot et d’une icône. Les messages évitent les noms d’outils de développement. Le code source ZIP est annoncé comme temporaire ; l’utilisateur est invité à ne jamais envoyer de mots de passe, clés ou informations privées.

## Navigation

La barre basse conserve trois destinations simples : **Builds**, **Nouveau** et **Aide**. Les icônes sont des pictogrammes cohérents plutôt que des caractères isolés. Le bouton central « Nouveau » est traité comme l’action la plus importante sans devenir une quatrième interface.
