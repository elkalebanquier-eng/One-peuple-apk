import { ScrollView, Switch, Text, View } from "react-native";
import { useState } from "react";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

export default function SettingsScreen() {
  const colors = useColors();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [keepArchives, setKeepArchives] = useState(true);

  const SettingRow = ({
    icon,
    label,
    value,
    isToggle = false,
    toggleValue = false,
    onToggle = () => undefined,
  }: {
    icon: string;
    label: string;
    value?: string;
    isToggle?: boolean;
    toggleValue?: boolean;
    onToggle?: (value: boolean) => void;
  }) => (
    <View
      className="flex-row items-center justify-between px-4 py-4 border-b"
      style={{ borderBottomColor: colors.border }}
    >
      <View className="flex-row items-center gap-3 flex-1">
        <Text className="text-2xl">{icon}</Text>
        <Text style={{ color: colors.foreground }} className="font-medium">
          {label}
        </Text>
      </View>
      {isToggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: colors.surface, true: colors.primary }}
          thumbColor={colors.background}
        />
      ) : (
        <Text style={{ color: colors.muted }} className="text-sm">
          {value ?? ""}
        </Text>
      )}
    </View>
  );

  return (
    <ScreenContainer containerClassName="flex-1" className="flex-1" edges={["top", "left", "right"]}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 border-b" style={{ borderBottomColor: colors.border }}>
          <Text className="text-2xl font-bold" style={{ color: colors.foreground }}>Paramètres One App</Text>
          <Text className="text-sm mt-1" style={{ color: colors.muted }}>Vos projets restent sur votre téléphone jusqu’à leur envoi.</Text>
        </View>

        <View className="mt-4">
          <Text className="px-4 py-2 font-semibold text-xs" style={{ color: colors.primary }}>BUILDS</Text>
          <SettingRow icon="🔔" label="Notifications de build" isToggle toggleValue={notificationsEnabled} onToggle={setNotificationsEnabled} />
          <SettingRow icon="📦" label="Conserver les archives ZIP" isToggle toggleValue={keepArchives} onToggle={setKeepArchives} />
          <SettingRow icon="🧪" label="Format de sortie" value="APK debug" />
        </View>

        <View className="mt-4">
          <Text className="px-4 py-2 font-semibold text-xs" style={{ color: colors.primary }}>STOCKAGE</Text>
          <SettingRow icon="📁" label="Dossier de travail" value="One App privé" />
          <SettingRow icon="🛡️" label="Code importé" value="Non partagé avant envoi" />
        </View>

        <View className="mt-4">
          <Text className="px-4 py-2 font-semibold text-xs" style={{ color: colors.primary }}>AIDE</Text>
          <SettingRow icon="❔" label="Projets acceptés" value="Expo · Android · HTML" />
          <View className="mx-4 mt-2 rounded-2xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
            <Text className="text-sm font-bold" style={{ color: colors.foreground }}>Créer une APK en 3 étapes</Text>
            <Text className="text-xs mt-2 leading-5" style={{ color: colors.muted }}>1. Choisissez le type qui correspond à votre code.</Text>
            <Text className="text-xs mt-1 leading-5" style={{ color: colors.muted }}>2. Sélectionnez le fichier ZIP de votre projet.</Text>
            <Text className="text-xs mt-1 leading-5" style={{ color: colors.muted }}>3. Lancez la compilation, attendez l’état « APK prête », puis téléchargez-la.</Text>
          </View>
          <View className="mx-4 mt-3 rounded-2xl border p-4" style={{ backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}55` }}>
            <Text className="text-xs leading-5" style={{ color: colors.muted }}>Une compilation peut prendre quelques minutes. Gardez simplement One App ouverte et revenez sur « Mes builds » pour voir l’avancement. La version gratuite accepte des ZIP de 50 Mo maximum et jusqu’à deux compilations par heure.</Text>
          </View>
          <SettingRow icon="ⓘ" label="À propos" value="One App v1.0.0" />
        </View>

        <View className="mt-8 px-4 py-4 items-center">
          <Text className="text-xs" style={{ color: colors.muted }}>One App v1.0.0</Text>
          <Text className="text-xs mt-1 text-center" style={{ color: colors.muted }}>Créez, testez et organisez vos applications depuis votre téléphone.</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
