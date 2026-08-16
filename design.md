# One App — Direction d’interface mobile

## Intention

One App devient un **atelier de compilation clair**, et non une succession de fiches techniques. Dès l’ouverture, la personne comprend une seule chose : elle peut choisir un projet, envoyer son fichier puis récupérer une APK de test. La navigation, les mots et les actions restent adaptés à un écran de téléphone et à une utilisation à une main.

L’interface utilise la marque existante : fond graphite profond, orange One App comme action principale et contraste fort pour les états de compilation. Le design évite les faux réglages, les badges décoratifs et les informations qui ne correspondent pas au fonctionnement réel.

| Rôle | Couleur | Usage |
|---|---:|---|
| Fond | `#121317` | Surface générale de l’application |
| Surface élevée | `#1B1D24` | Zones de contenu et éléments sélectionnables |
| Orange One App | `#FF7A30` | Lancer une compilation et action principale |
| Vert résultat | `#34D399` | APK disponible et fichier reconnu |
| Bleu progression | `#7AA7FF` | Compilation en cours |
| Rouge action requise | `#FF5C72` | Erreur expliquée et action à corriger |

## Écrans et composition

| Écran | Composition retenue | Action prioritaire |
|---|---|---|
| **Builds** | En-tête compact « One App », zone principale de démarrage et liste de builds avec un statut très lisible. L’état vide explique les trois types acceptés en une phrase. | **Créer une APK** |
| **Nouvelle compilation** | Progression 1–2–3 fixe en haut ; choix du type sous forme de trois options larges, puis zone d’import et nom du projet. | **Choisir le type**, puis **Lancer la compilation** |
| **Résultat dans la liste** | Pastille de statut, message humain, bouton plein format uniquement lorsque l’APK est prête et rappel de la durée de disponibilité. | **Télécharger l’APK** |
| **Aide** | Guide court « Préparer / Choisir / Télécharger », formats réellement acceptés et avertissement sur les données secrètes. | **Créer une compilation** |
| **Réglages** | Informations utiles uniquement : limite, format de sortie, confidentialité et version. Aucun interrupteur qui ne pilote pas une fonction réelle. | Retourner créer une compilation |

## Flux principal

1. L’utilisateur ouvre **Builds** et touche le grand bouton orange situé dans le bas de la zone de démarrage.
2. Il sélectionne un seul type : **Expo / React Native**, **Android natif** ou **HTML**.
3. La zone d’import se déverrouille et explique le fichier attendu avec des mots simples.
4. Une fois le fichier et le nom renseignés, il touche **Lancer la compilation**.
5. Le build affiche une étape lisible : en attente, compilation, APK prête ou action à corriger.
6. Quand l’APK est prête, le bouton de téléchargement explique qu’elle est destinée aux tests et que le lien est temporaire.

## Règles d’interaction

Les boutons d’action ont une hauteur minimum de 52 px et sont placés en bas des contenus lorsque cela est possible. La sélection de type garde une zone tactile large. Une pression applique seulement une légère baisse d’opacité et une réduction à `0,98`, sans animation spectaculaire.

Les états ne reposent jamais sur la couleur seule : chaque couleur est accompagnée d’un mot et d’une icône. Les messages évitent les noms d’outils de développement. Le code source ZIP est annoncé comme temporaire ; l’utilisateur est invité à ne jamais envoyer de mots de passe, clés ou informations privées.

## Navigation

La barre basse conserve trois destinations simples : **Builds**, **Nouveau** et **Aide**. Les icônes sont des pictogrammes cohérents plutôt que des caractères isolés. Le bouton central « Nouveau » est traité comme l’action la plus importante sans devenir une quatrième interface.
