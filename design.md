# One App — Plan d’interface mobile

## Direction du produit

One App est une application mobile portrait conçue pour permettre à une personne, depuis son téléphone, de déposer un projet logiciel et de demander une APK debug. L’interface cache les outils de développement : l’utilisateur choisit un type de projet, sélectionne son archive, puis suit une seule demande de compilation.

La direction visuelle utilise une identité One App sombre, nette et premium, centrée sur un symbole de code transformé en application. L’usage doit rester possible d’une seule main sur un écran 9:16.

| Élément | Choix appliqué |
|---|---|
| Fond | `#121317` |
| Surfaces | `#1B1D24` |
| Action principale | `#FF7A30` |
| Succès | `#34D399` |
| Erreur | `#FF5C72` |
| Texte principal | `#FFFFFF` |
| Texte secondaire | `rgba(255,255,255,0.64)` |

## Liste des écrans

| Écran | Contenu et fonction principale |
|---|---|
| **Mes builds** | Liste des projets récents avec statut : brouillon, en attente, compilation, terminé ou erreur. Bouton principal « Nouveau build ». |
| **Choisir le type** | Trois cartes grand format : Expo / React Native, Android natif, HTML. Aucune sélection de fichier n’est possible avant ce choix. |
| **Importer le code** | Explication adaptée au type, bouton ouvrant le sélecteur de fichiers Android et résumé du ZIP choisi. |
| **Vérifier et envoyer** | Nom du projet, type, fichier, taille et rappel que la sortie est une APK debug. Le bouton d’envoi est activé seulement lorsque la validation passe. |
| **Suivi du build** | Chronologie non surchargée : fichier reçu, dans la file, compilation, APK prête ou erreur claire. |
| **Détail du résultat** | Bouton de téléchargement de l’APK debug, date d’expiration du lien et message destiné aux tests. |
| **Aide** | Explication courte des formats acceptés et des causes habituelles de refus. |

## Flux utilisateur principal

1. La personne ouvre **Mes builds** puis touche **Nouveau build** dans la zone basse, facile à atteindre avec le pouce.
2. Elle choisit **Expo / React Native**, **Android natif** ou **HTML**.
3. One App adapte l’explication, puis ouvre le sélecteur de documents afin de choisir une archive ZIP.
4. L’écran vérifie le choix et autorise **Envoyer et compiler** uniquement si le ZIP correspond au type annoncé.
5. L’utilisateur suit une chronologie claire et télécharge l’APK debug lorsque la compilation est terminée.

## Principes d’interaction

Les boutons principaux utilisent un retour d’opacité et une légère réduction à la pression. Les boutons d’action ont une hauteur minimale de 48 px. Les erreurs sont rédigées en français simple avec une solution concrète ; elles ne doivent jamais afficher de trace Gradle ou l’écran rouge Metro.

Les éléments détaillés, comme les journaux techniques, restent masqués dans une section « Voir le détail » afin que l’écran principal reste lisible.
