import { ScrollView, Text, View, TouchableOpacity, FlatList, Image, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useEffect, useState } from "react";
import { subscribeToPosts, type Post } from "@/lib/firebase";
import { getMediaUrl } from "@/lib/media-upload";

// Mock data for stories
const mockStories = [
  { id: 1, name: "Ajouter", emoji: "➕", isAdd: true },
  { id: 2, name: "Khadija", emoji: "👩", hasNew: true },
  { id: 3, name: "Ahmed", emoji: "👨", hasNew: false },
  { id: 4, name: "Fatima", emoji: "👩", hasNew: true },
  { id: 5, name: "Mohamed", emoji: "👨", hasNew: false },
];

// Mock data for video cards
const mockVideos = [
  {
    id: 1,
    author: "Khadija",
    avatar: "👩",
    title: "Développement Web",
    likes: 234,
    comments: 45,
    shares: 12,
    liked: false,
  },
  {
    id: 2,
    author: "Ahmed",
    avatar: "👨",
    title: "Startup Tech",
    likes: 567,
    comments: 89,
    shares: 34,
    liked: false,
  },
  {
    id: 3,
    author: "Fatima",
    avatar: "👩",
    title: "Design UI/UX",
    likes: 345,
    comments: 67,
    shares: 23,
    liked: false,
  },
];

function StoryBubble({ story }: { story: (typeof mockStories)[0] }) {
  const colors = useColors();
  
  if (story.isAdd) {
    return (
      <TouchableOpacity className="items-center gap-1.5 flex-shrink-0">
        <View
          className="w-16 h-16 rounded-full border-2 border-dashed items-center justify-center"
          style={{ borderColor: colors.primary, backgroundColor: colors.surface }}
        >
          <Text className="text-2xl">{story.emoji}</Text>
        </View>
        <Text className="text-xs text-center max-w-16" numberOfLines={1} style={{ color: colors.primary }}>
          {story.name}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity className="items-center gap-1.5 flex-shrink-0 active:opacity-75">
      <View
        className="w-16 h-16 rounded-full border-2 items-center justify-center"
        style={{
          borderColor: story.hasNew ? colors.primary : colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <Text className="text-2xl">{story.emoji}</Text>
        {story.hasNew && (
          <View
            className="absolute bottom-0 right-0 px-1 py-0.5 rounded-full text-xs font-bold"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-xs font-bold" style={{ color: colors.background }}>
              NEW
            </Text>
          </View>
        )}
      </View>
      <Text className="text-xs text-center max-w-16" numberOfLines={1} style={{ color: colors.foreground }}>
        {story.name}
      </Text>
    </TouchableOpacity>
  );
}

interface VideoCardProps {
  id: string;
  author: string;
  avatar: string;
  title: string;
  likes: number;
  comments: number;
  shares: number;
  liked: boolean;
}

function VideoCard({ video }: { video: VideoCardProps }) {
  const colors = useColors();
  
  return (
    <TouchableOpacity
      className="rounded-2xl overflow-hidden mb-4 active:opacity-90"
      style={{ backgroundColor: colors.surface }}
    >
      {/* Video placeholder */}
      <View
        className="w-full aspect-video items-center justify-center"
        style={{ backgroundColor: colors.background }}
      >
        <Text className="text-5xl">▶️</Text>
      </View>

      {/* Content section */}
      <View className="p-4">
        {/* Header */}
        <View className="flex-row items-center gap-3 mb-3">
          <View
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.border }}
          >
            <Text className="text-lg">{video.avatar}</Text>
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-sm" style={{ color: colors.foreground }}>
              {video.author}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text className="font-bold text-base mb-3" style={{ color: colors.foreground }}>
          {video.title}
        </Text>

        {/* Actions */}
        <View className="flex-row justify-between gap-2">
          <TouchableOpacity className="flex-row items-center gap-1 flex-1 p-2 rounded-lg active:opacity-70" style={{ backgroundColor: colors.background }}>
            <Text className="text-lg">❤️</Text>
            <Text className="text-xs" style={{ color: colors.muted }}>
              {video.likes}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center gap-1 flex-1 p-2 rounded-lg active:opacity-70" style={{ backgroundColor: colors.background }}>
            <Text className="text-lg">💬</Text>
            <Text className="text-xs" style={{ color: colors.muted }}>
              {video.comments}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center gap-1 flex-1 p-2 rounded-lg active:opacity-70" style={{ backgroundColor: colors.background }}>
            <Text className="text-lg">📤</Text>
            <Text className="text-xs" style={{ color: colors.muted }}>
              {video.shares}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToPosts((p) => {
      setPosts(p);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

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
        <View className="px-4 py-4 flex-row items-center justify-between">
          <Text className="text-2xl font-bold" style={{ color: colors.primary }}>
            KIKO👑
          </Text>
          <TouchableOpacity className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: colors.surface }}>
            <Text className="text-lg">🔔</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Banner */}
        <View className="px-4 mb-6">
          <View
            className="w-full rounded-2xl overflow-hidden aspect-video items-center justify-center"
            style={{ backgroundColor: colors.surface }}
          >
            <Text className="text-6xl">🎬</Text>
          </View>
        </View>

        {/* Stories Section */}
        <View className="mb-6">
          <Text className="text-lg font-bold px-4 mb-3" style={{ color: colors.foreground }}>
            Stories
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          >
            {mockStories.map((story) => (
              <StoryBubble key={story.id} story={story} />
            ))}
          </ScrollView>
        </View>

        {/* Video Feed Section */}
        <View className="px-4">
          <Text className="text-lg font-bold mb-3" style={{ color: colors.foreground }}>
            Feed
          </Text>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : posts.length > 0 ? (
            posts.map((post) => (
              <VideoCard
                key={post.id}
                video={{
                  id: post.id,
                  author: post.auteur || "Anonyme",
                  avatar: post.authorAvatar || "👤",
                  title: post.titre || post.text || "Post",
                  likes: post.likes || 0,
                  comments: 0,
                  shares: post.shares || 0,
                  liked: false,
                }}
              />
            ))
          ) : (
            <Text style={{ color: colors.muted }}>Aucun post pour le moment</Text>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
