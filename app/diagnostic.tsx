import { Text, View, TouchableOpacity, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import Constants from "expo-constants";

export default function DiagnosticScreen() {
  const colors = useColors();
  const [storageStatus, setStorageStatus] = useState("Vérification...");
  const [mediaCount, setMediaCount] = useState(0);

  useEffect(() => {
    async function checkSystem() {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const docDir = FileSystem.documentDirectory;
        let count = 0;
        if (docDir) {
          const dirInfo = await FileSystem.getInfoAsync(docDir + "one-app/");
          if (dirInfo.exists) {
            const files = await FileSystem.readDirectoryAsync(docDir + "one-app/");
            count = files.length;
          }
        }
        setStorageStatus(`AsyncStorage OK (${keys.length} clés). DocDir actif.`);
        setMediaCount(count);
      } catch (err) {
        setStorageStatus("Erreur diagnostic: " + String(err));
      }
    }
    checkSystem();
  }, []);

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="gap-6">
        <View className="items-center gap-2 py-4">
          <Text className="text-3xl font-bold text-foreground">One App — Diagnostic</Text>
          <Text className="text-sm text-muted text-center">
            Écran de test isolé (hors navigation principale)
          </Text>
        </View>

        <View className="bg-surface rounded-2xl p-5 border border-border gap-3">
          <Text className="text-lg font-semibold text-foreground">État du Stockage Local</Text>
          <Text className="text-sm text-muted">{storageStatus}</Text>
          <Text className="text-sm text-muted">Médias locaux sauvegardés : {mediaCount}</Text>
          <Text className="text-sm text-muted">Package: {Constants.expoConfig?.android?.package ?? "N/A"}</Text>
        </View>

        <View className="items-center py-4">
          <TouchableOpacity
            onPress={() => alert("Diagnostic exécuté avec succès sur l’APK local.")}
            className="px-6 py-3 rounded-full"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="font-bold" style={{ color: colors.background }}>
              Tester l’interaction native
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
