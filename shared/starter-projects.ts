import type { ProjectType } from "@/lib/build-store";

export type StarterProjectId = "html" | "expo" | "android";

export type StarterProject = {
  id: StarterProjectId;
  projectType: ProjectType;
  title: string;
  description: string;
  projectName: string;
  files: Array<{ name: string; content: string }>;
};

const HTML_TEMPLATE = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ma première application</title><style>body{margin:0;background:#0A0A0F;color:#fff;font-family:Arial,sans-serif}.page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box}.card{max-width:360px;text-align:center}.badge{color:#D4AF37;font-weight:bold;letter-spacing:1px}.button{display:inline-block;margin-top:18px;padding:14px 20px;border:0;border-radius:12px;background:#D4AF37;color:#0A0A0F;font-weight:bold}</style></head><body><main class="page"><section class="card"><p class="badge">MON PREMIER PROJET</p><h1>Bonjour depuis mon APK</h1><p>Modifiez ce texte, les couleurs et le bouton pour créer votre application.</p><button class="button" onclick="document.querySelector('h1').textContent='Bravo, votre application fonctionne !'">Essayer le bouton</button></section></main></body></html>`;

const EXPO_APP = `import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

export default function App() {
  const [message, setMessage] = useState('Bonjour depuis mon APK');
  return <View style={styles.page}><StatusBar style="light" /><Text style={styles.badge}>MON PREMIER PROJET</Text><Text style={styles.title}>{message}</Text><Text style={styles.text}>Modifiez App.js pour créer votre application mobile.</Text><Pressable style={styles.button} onPress={() => setMessage('Bravo, votre application fonctionne !')}><Text style={styles.buttonText}>Essayer le bouton</Text></Pressable></View>;
}
const styles = StyleSheet.create({ page:{flex:1,justifyContent:'center',alignItems:'center',padding:24,backgroundColor:'#0A0A0F'},badge:{color:'#D4AF37',fontWeight:'800',letterSpacing:1},title:{color:'#fff',fontSize:30,fontWeight:'800',marginTop:14,textAlign:'center'},text:{color:'#B7B7C2',fontSize:16,lineHeight:23,marginTop:12,textAlign:'center'},button:{backgroundColor:'#D4AF37',borderRadius:12,marginTop:22,paddingHorizontal:20,paddingVertical:14},buttonText:{color:'#0A0A0F',fontWeight:'800'} });`;

const ANDROID_ACTIVITY = `package com.miastarter;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    LinearLayout page = new LinearLayout(this); page.setOrientation(LinearLayout.VERTICAL); page.setGravity(Gravity.CENTER); page.setPadding(48,48,48,48); page.setBackgroundColor(Color.rgb(10,10,15));
    TextView title = new TextView(this); title.setText("Bonjour depuis mon APK"); title.setTextSize(28); title.setTextColor(Color.WHITE); title.setGravity(Gravity.CENTER);
    Button button = new Button(this); button.setText("ESSAYER LE BOUTON"); button.setOnClickListener(v -> title.setText("Bravo, votre application fonctionne !"));
    page.addView(title); page.addView(button); setContentView(page);
  }
}`;

const ANDROID_GRADLEW = `#!/usr/bin/env sh
set -eu
VERSION=8.11.1
ROOT="\${HOME}/.cache/mia-gradle-\${VERSION}"
if [ ! -x "$ROOT/gradle-\${VERSION}/bin/gradle" ]; then
  mkdir -p "$ROOT"
  curl --fail --location --retry 2 --output "$ROOT/gradle.zip" "https://services.gradle.org/distributions/gradle-\${VERSION}-bin.zip"
  unzip -q "$ROOT/gradle.zip" -d "$ROOT"
fi
exec "$ROOT/gradle-\${VERSION}/bin/gradle" "$@"
`;

export const STARTER_PROJECTS: StarterProject[] = [
  { id: "html", projectType: "html", title: "Modèle HTML", description: "Une page d’accueil simple avec un bouton.", projectName: "Ma page HTML", files: [{ name: "index.html", content: HTML_TEMPLATE }] },
  { id: "expo", projectType: "expo", title: "Modèle Expo", description: "Une première app mobile React Native.", projectName: "Mon app Expo", files: [
    { name: "package.json", content: JSON.stringify({ name: "mia-starter-expo", version: "1.0.0", main: "node_modules/expo/AppEntry.js", scripts: { start: "expo start" }, dependencies: { expo: "~54.0.0", react: "19.1.0", "react-native": "0.81.0" }, private: true }, null, 2) },
    { name: "app.json", content: JSON.stringify({ expo: { name: "MIA Starter Expo", slug: "mia-starter-expo", version: "1.0.0", orientation: "portrait" } }, null, 2) },
    { name: "App.js", content: EXPO_APP },
  ] },
  { id: "android", projectType: "android", title: "Modèle Android", description: "Une application Android native minimaliste.", projectName: "Mon app Android", files: [
    { name: "settings.gradle", content: "pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }\ndependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }\nrootProject.name = 'MiaStarterAndroid'\ninclude ':app'\n" },
    { name: "build.gradle", content: "plugins { id 'com.android.application' version '8.7.3' apply false }\n" },
    { name: "gradlew", content: ANDROID_GRADLEW },
    { name: "app/build.gradle", content: "plugins { id 'com.android.application' }\n\nandroid { namespace 'com.miastarter'; compileSdk 35\n defaultConfig { applicationId 'com.miastarter'; minSdk 24; targetSdk 35; versionCode 1; versionName '1.0.0' } }\n" },
    { name: "app/src/main/AndroidManifest.xml", content: "<manifest xmlns:android=\"http://schemas.android.com/apk/res/android\"><application android:theme=\"@style/AppTheme\" android:label=\"MIA Starter\"><activity android:name=\".MainActivity\" android:exported=\"true\"><intent-filter><action android:name=\"android.intent.action.MAIN\"/><category android:name=\"android.intent.category.LAUNCHER\"/></intent-filter></activity></application></manifest>" },
    { name: "app/src/main/res/values/styles.xml", content: "<resources><style name=\"AppTheme\" parent=\"android:style/Theme.Material.Light.NoActionBar\" /></resources>" },
    { name: "app/src/main/java/com/miastarter/MainActivity.java", content: ANDROID_ACTIVITY },
  ] },
];

export function getStarterProject(id: StarterProjectId) {
  return STARTER_PROJECTS.find((starter) => starter.id === id) ?? null;
}
