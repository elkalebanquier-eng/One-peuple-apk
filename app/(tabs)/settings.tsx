import { ScrollView, Text, View, TouchableOpacity, Switch } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

export default function SettingsScreen() {
  const colors = useColors();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const SettingRow = ({
    icon,
    label,
    value,
    onPress,
    isToggle = false,
    toggleValue = false,
    onToggle = () => {},
  }: {
    icon: string;
    label: string;
    value?: string;
    onPress?: () => void;
    isToggle?: boolean;
    toggleValue?: boolean;
    onToggle?: (val: boolean) => void;
  }) => (
    <TouchableOpacity
      className="flex-row items-center justify-between px-4 py-4 border-b active:opacity-70"
      style={{ borderBottomColor: colors.border }}
      onPress={onPress}
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
        <View className="flex-row items-center gap-2">
          {value && (
            <Text style={{ color: colors.muted }} className="text-sm">
              {value}
            </Text>
          )}
          <Text style={{ color: colors.muted }}>›</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <ScreenContainer
      containerClassName="flex-1"
      className="flex-1"
      edges={["top", "left", "right"]}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-4 py-4 border-b" style={{ borderBottomColor: colors.border }}>
          <Text className="text-2xl font-bold" style={{ color: colors.foreground }}>
            Paramètres
          </Text>
        </View>

        {/* Account Section */}
        <View className="mt-4">
          <Text className="px-4 py-2 font-semibold text-xs" style={{ color: colors.primary }}>
            COMPTE
          </Text>
          <SettingRow icon="👤" label="Profil" value="Khadija Diallo" />
          <SettingRow icon="🔐" label="Mot de passe" />
          <SettingRow icon="📧" label="Email" value="khadija@example.com" />
        </View>

        {/* Notifications Section */}
        <View className="mt-4">
          <Text className="px-4 py-2 font-semibold text-xs" style={{ color: colors.primary }}>
            NOTIFICATIONS
          </Text>
          <SettingRow
            icon="🔔"
            label="Notifications"
            isToggle
            toggleValue={notificationsEnabled}
            onToggle={setNotificationsEnabled}
          />
          <SettingRow icon="💬" label="Messages" />
          <SettingRow icon="❤️" label="Likes" />
          <SettingRow icon="👥" label="Followers" />
        </View>

        {/* Appearance Section */}
        <View className="mt-4">
          <Text className="px-4 py-2 font-semibold text-xs" style={{ color: colors.primary }}>
            APPARENCE
          </Text>
          <SettingRow
            icon="🌙"
            label="Mode sombre"
            isToggle
            toggleValue={darkMode}
            onToggle={setDarkMode}
          />
          <SettingRow icon="🌐" label="Langue" value="Français" />
        </View>

        {/* Privacy Section */}
        <View className="mt-4">
          <Text className="px-4 py-2 font-semibold text-xs" style={{ color: colors.primary }}>
            CONFIDENTIALITÉ
          </Text>
          <SettingRow icon="🔒" label="Compte privé" />
          <SettingRow icon="👁️" label="Qui peut me voir" />
          <SettingRow icon="🚫" label="Utilisateurs bloqués" />
        </View>

        {/* Support Section */}
        <View className="mt-4">
          <Text className="px-4 py-2 font-semibold text-xs" style={{ color: colors.primary }}>
            SUPPORT
          </Text>
          <SettingRow icon="❓" label="Aide" />
          <SettingRow icon="📋" label="Conditions d'utilisation" />
          <SettingRow icon="🔐" label="Politique de confidentialité" />
          <SettingRow icon="ℹ️" label="À propos" value="v1.0.0" />
        </View>

        {/* Danger Zone */}
        <View className="mt-6 px-4">
          <TouchableOpacity
            className="py-3 px-4 rounded-lg items-center mb-2 active:opacity-70"
            style={{ backgroundColor: "rgba(255, 92, 114, 0.1)" }}
          >
            <Text className="font-semibold" style={{ color: "#FF5C72" }}>
              Déconnexion
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="py-3 px-4 rounded-lg items-center active:opacity-70"
            style={{ backgroundColor: "rgba(255, 92, 114, 0.1)" }}
          >
            <Text className="font-semibold" style={{ color: "#FF5C72" }}>
              Supprimer le compte
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View className="mt-8 px-4 py-4 items-center">
          <Text className="text-xs" style={{ color: colors.muted }}>
            KIKO👑 v1.0.0
          </Text>
          <Text className="text-xs mt-1" style={{ color: colors.muted }}>
            © 2024 KIKO. Tous droits réservés.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
