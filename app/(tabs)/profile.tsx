import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

const mockUserPosts = [
  { id: 1, type: "video", thumbnail: "🎬" },
  { id: 2, type: "photo", thumbnail: "📷" },
  { id: 3, type: "video", thumbnail: "🎬" },
  { id: 4, type: "photo", thumbnail: "📷" },
  { id: 5, type: "video", thumbnail: "🎬" },
  { id: 6, type: "photo", thumbnail: "📷" },
];

export default function ProfileScreen() {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState("posts");

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
        <View className="px-4 py-4 flex-row items-center justify-between border-b" style={{ borderBottomColor: colors.border }}>
          <Text className="text-2xl font-bold" style={{ color: colors.foreground }}>
            Profil
          </Text>
          <TouchableOpacity className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: colors.surface }}>
            <Text className="text-lg">⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Header */}
        <View className="px-4 py-6 items-center border-b" style={{ borderBottomColor: colors.border }}>
          {/* Avatar */}
          <View
            className="w-24 h-24 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: colors.surface }}
          >
            <Text className="text-5xl">👤</Text>
          </View>

          {/* Name */}
          <Text className="text-2xl font-bold mb-1" style={{ color: colors.foreground }}>
            Khadija Diallo
          </Text>
          <Text className="text-sm mb-4" style={{ color: colors.muted }}>
            @khadija.diallo
          </Text>

          {/* Bio */}
          <Text className="text-sm text-center mb-6" style={{ color: colors.muted }}>
            Développeuse Web | Créatrice de contenu | Passionnée par la tech 💻
          </Text>

          {/* Stats */}
          <View className="flex-row gap-8 mb-6">
            <View className="items-center">
              <Text className="text-xl font-bold" style={{ color: colors.foreground }}>
                1.2K
              </Text>
              <Text className="text-xs" style={{ color: colors.muted }}>
                Followers
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-xl font-bold" style={{ color: colors.foreground }}>
                342
              </Text>
              <Text className="text-xs" style={{ color: colors.muted }}>
                Following
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-xl font-bold" style={{ color: colors.foreground }}>
                56
              </Text>
              <Text className="text-xs" style={{ color: colors.muted }}>
                Posts
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3 w-full">
            <TouchableOpacity
              className="flex-1 py-2.5 rounded-lg items-center"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="font-bold text-sm" style={{ color: colors.background }}>
                Modifier profil
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-2.5 rounded-lg items-center border"
              style={{ borderColor: colors.border, backgroundColor: colors.surface }}
            >
              <Text className="font-bold text-sm" style={{ color: colors.foreground }}>
                Partager
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row border-b" style={{ borderBottomColor: colors.border }}>
          <TouchableOpacity
            className="flex-1 py-4 items-center border-b-2"
            style={{
              borderBottomColor: activeTab === "posts" ? colors.primary : "transparent",
            }}
            onPress={() => setActiveTab("posts")}
          >
            <Text
              className="font-semibold"
              style={{
                color: activeTab === "posts" ? colors.primary : colors.muted,
              }}
            >
              Posts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 py-4 items-center border-b-2"
            style={{
              borderBottomColor: activeTab === "likes" ? colors.primary : "transparent",
            }}
            onPress={() => setActiveTab("likes")}
          >
            <Text
              className="font-semibold"
              style={{
                color: activeTab === "likes" ? colors.primary : colors.muted,
              }}
            >
              Likes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 py-4 items-center border-b-2"
            style={{
              borderBottomColor: activeTab === "saved" ? colors.primary : "transparent",
            }}
            onPress={() => setActiveTab("saved")}
          >
            <Text
              className="font-semibold"
              style={{
                color: activeTab === "saved" ? colors.primary : colors.muted,
              }}
            >
              Sauvegardés
            </Text>
          </TouchableOpacity>
        </View>

        {/* Posts Grid */}
        <View className="px-2 py-4">
          <View className="flex-row flex-wrap gap-2">
            {mockUserPosts.map((post) => (
              <TouchableOpacity
                key={post.id}
                className="flex-1 aspect-square rounded-lg items-center justify-center active:opacity-70"
                style={{ backgroundColor: colors.surface, minWidth: "30%" }}
              >
                <Text className="text-3xl">{post.thumbnail}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
