import { Tabs } from "expo-router";
import { Platform, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Builds", tabBarIcon: ({ color }) => <IconSymbol size={25} name="house.fill" color={color} /> }} />
      <Tabs.Screen name="create" options={{ title: "Nouveau", tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 24, fontWeight: "700" }}>＋</Text> }} />
      <Tabs.Screen name="profile" options={{ title: "Aide", tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 21 }}>?</Text> }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
