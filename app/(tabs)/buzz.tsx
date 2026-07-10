import { ScrollView, Text, View, TouchableOpacity, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";

// Mock data for buzz videos
const mockBuzzVideos = [
  {
    id: 1,
    author: "Khadija",
    avatar: "👩",
    title: "Développement Web 2024",
    views: "2.3M",
    likes: 234,
    comments: 45,
    shares: 12,
  },
  {
    id: 2,
    author: "Ahmed",
    avatar: "👨",
    title: "Startup Success Story",
    views: "5.6M",
    likes: 567,
    comments: 89,
    shares: 34,
  },
  {
    id: 3,
    author: "Fatima",
    avatar: "👩",
    title: "Design Trends 2024",
    views: "3.4M",
    likes: 345,
    comments: 67,
    shares: 23,
  },
  {
    id: 4,
    author: "Mohamed",
    avatar: "👨",
    title: "Tech Innovation",
    views: "1.2M",
    likes: 123,
    comments: 34,
    shares: 12,
  },
];

function BuzzVideoCard({ video }: { video: (typeof mockBuzzVideos)[0] }) {
  const colors = useColors();

  return (
    <TouchableOpacity
      className="w-full rounded-2xl overflow-hidden mb-4 active:opacity-90"
      style={{ backgroundColor: colors.surface, minHeight: 400 }}
    >
      {/* Video placeholder */}
      <View
        className="w-full aspect-video items-center justify-center relative"
        style={{ backgroundColor: colors.background }}
      >
        <Text className="text-6xl">▶️</Text>
        <View className="absolute bottom-2 right-2 px-2 py-1 rounded-lg" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <Text className="text-xs text-white font-semibold">3:45</Text>
        </View>
      </View>

      {/* Content section */}
      <View className="p-4">
        {/* Header */}
        <View className="flex-row items-center gap-3 mb-3">
          <View
            className="w-12 h-12 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.border }}
          >
            <Text className="text-2xl">{video.avatar}</Text>
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-sm" style={{ color: colors.foreground }}>
              {video.author}
            </Text>
            <Text className="text-xs" style={{ color: colors.muted }}>
              {video.views} views
            </Text>
          </View>
          <TouchableOpacity className="px-3 py-1 rounded-full" style={{ backgroundColor: colors.primary }}>
            <Text className="text-xs font-bold" style={{ color: colors.background }}>
              Follow
            </Text>
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text className="font-bold text-base mb-3" style={{ color: colors.foreground }}>
          {video.title}
        </Text>

        {/* Actions */}
        <View className="flex-row justify-between gap-2">
          <TouchableOpacity
            className="flex-row items-center gap-1 flex-1 p-2 rounded-lg active:opacity-70"
            style={{ backgroundColor: colors.background }}
          >
            <Text className="text-lg">❤️</Text>
            <Text className="text-xs font-semibold" style={{ color: colors.muted }}>
              {video.likes}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center gap-1 flex-1 p-2 rounded-lg active:opacity-70"
            style={{ backgroundColor: colors.background }}
          >
            <Text className="text-lg">💬</Text>
            <Text className="text-xs font-semibold" style={{ color: colors.muted }}>
              {video.comments}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center gap-1 flex-1 p-2 rounded-lg active:opacity-70"
            style={{ backgroundColor: colors.background }}
          >
            <Text className="text-lg">📤</Text>
            <Text className="text-xs font-semibold" style={{ color: colors.muted }}>
              {video.shares}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center gap-1 flex-1 p-2 rounded-lg active:opacity-70"
            style={{ backgroundColor: colors.background }}
          >
            <Text className="text-lg">🔖</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function BuzzScreen() {
  const colors = useColors();

  return (
    <ScreenContainer
      containerClassName="flex-1"
      className="flex-1"
      edges={["top", "left", "right"]}
    >
      <View className="flex-1">
        {/* Header */}
        <View className="px-4 py-4 flex-row items-center justify-between border-b" style={{ borderBottomColor: colors.border }}>
          <Text className="text-2xl font-bold" style={{ color: colors.foreground }}>
            Buzz 🔥
          </Text>
          <TouchableOpacity className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: colors.surface }}>
            <Text className="text-lg">⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Video Feed */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {mockBuzzVideos.map((video) => (
            <BuzzVideoCard key={video.id} video={video} />
          ))}
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}
