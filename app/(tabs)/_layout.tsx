import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>➕</Text>,
        }}
      />
      <Tabs.Screen
        name="buzz"
        options={{
          title: "Buzz",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>🔥</Text>,
        }}
      />
      <Tabs.Screen
        name="opportunities"
        options={{
          title: "Opportunities",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>💼</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>👤</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}
