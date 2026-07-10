#!/bin/bash

# Script pour générer l'APK KIKO native
# Usage: ./scripts/build-apk.sh

set -e

echo "🔨 Préparation de la génération APK KIKO..."

# Vérifier que EAS CLI est installé
if ! command -v eas &> /dev/null; then
    echo "📦 Installation de EAS CLI..."
    npm install -g eas-cli
fi

# Vérifier que Expo CLI est installé
if ! command -v expo &> /dev/null; then
    echo "📦 Installation de Expo CLI..."
    npm install -g expo-cli
fi

echo "✅ Dépendances vérifiées"
echo ""

# Vérifier app.config.ts
echo "📋 Vérification de la configuration..."
if grep -q "{{project_title}}" app.config.ts; then
    echo "⚠️  ERREUR: app.config.ts contient encore des placeholders"
    echo "Veuillez mettre à jour app.config.ts avec vos informations"
    exit 1
fi

echo "✅ Configuration valide"
echo ""

# Optionnel: Faire un test build local
echo "🏗️  Construction locale du bundle..."
pnpm run build 2>/dev/null || true

echo ""
echo "🚀 Génération APK avec EAS Build..."
echo ""
echo "Deux options:"
echo "1. Générer localement (nécessite Android SDK)"
echo "2. Générer dans le cloud avec EAS (recommandé)"
echo ""
echo "Pour générer dans le cloud:"
echo "  eas build --platform android --local=false"
echo ""
echo "Pour générer localement:"
echo "  eas build --platform android --local=true"
echo ""
echo "Pour plus d'infos: https://docs.expo.dev/build/setup/"
