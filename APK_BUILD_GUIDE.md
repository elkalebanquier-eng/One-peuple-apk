# Guide de build Android — One App

## Ce qui est construit

La compilation produit une **APK de test installable** pour One App elle-même. Elle contient son bundle JavaScript, ses icônes et ses ressources ; elle ne dépend pas d’un serveur Metro.

## Parcours automatisé

Le workflow `Build One App APK` réalise les actions suivantes :

1. Installe les dépendances verrouillées.
2. Vérifie TypeScript.
3. Génère le projet Android Expo.
4. Compile la variante Android release signée avec la clé de test.
5. Dépose `one-app-test.apk` comme artefact téléchargeable.

## Contrôles avant un build

```bash
pnpm check
pnpm lint
pnpm test
```

## À propos des APK des utilisateurs

One App accepte les projets Expo / React Native, Android natif et HTML sous ZIP après sélection du type. Elle les conserve d’abord dans son stockage privé puis les valide. Pour obtenir une APK pour un projet d’utilisateur, le ZIP doit être exécuté dans un environnement de build distant, limité et supprimé après le résultat. Cette protection empêche un projet importé d’accéder au téléphone ou à l’application One App elle-même.
