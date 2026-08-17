# Relais Workers AI de One App

Ce fichier décrit le relais technique utilisé par One App pour générer du code avec Workers AI. Il n’est pas une page web et ne contient aucun secret ni jeton. Le Worker reçoit seulement une demande de code, limite chaque installation à vingt demandes environ par heure puis appelle le modèle Workers AI au moyen du binding `AI`.

L’application mobile ne contient aucune clé Cloudflare. Le code complet du Worker est dans `one-app-ai-worker.js` afin que sa configuration soit conservée avec le code source One App.
