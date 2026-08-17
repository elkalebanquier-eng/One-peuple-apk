import { Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);
  const tabBarHeight = 58 + bottomPadding;

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, headerShown: false, tabBarButton: HapticTab, tabBarStyle: { paddingTop: 9, paddingBottom: bottomPadding, height: tabBarHeight, backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, elevation: 0 }, tabBarLabelStyle: { fontSize: 11, fontWeight: "800", letterSpacing: 0.1 }, tabBarItemStyle: { paddingTop: 1 } }}>
      <Tabs.Screen name="index" options={{ title: "Builds", tabBarIcon: ({ color }) => <MaterialIcons color={color} name="view-list" size={24} /> }} />
      <Tabs.Screen name="create" options={{ title: "Nouveau", tabBarIcon: ({ color }) => <MaterialIcons color={color} name="add-circle-outline" size={26} /> }} />
      <Tabs.Screen name="assistant" options={{ title: "IA Code", tabBarIcon: ({ color }) => <MaterialIcons color={color} name="auto-awesome" size={23} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Aide", tabBarIcon: ({ color }) => <MaterialIcons color={color} name="help-outline" size={24} /> }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
