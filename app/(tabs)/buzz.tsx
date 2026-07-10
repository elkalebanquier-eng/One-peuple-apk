import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useEffect, useState } from "react";
import { subscribeToVideos, type Video } from "@/lib/firebase";
import { getMediaUrl } from "@/lib/media-upload";

function BuzzVideoCard({ video }: { video: Video }) {
  const colors = useColors();

  return (
    <TouchableOpacity
      className="w-full rounded-2xl overflow-hidden mb-4 active:opacity-90"
      style={{ backgroundColor: colors.surface, minHeight: 400 }}
    >
      {/* Video placeholder */}
      <View
        className="w-full aspect-video items-center justify-center relative overflow-hidden"
        style={{ backgroundColor: colors.background }}
      >
        {video.videoUrl ? (
          <>
            <Image
              source={{ uri: getMediaUrl(video.videoUrl, "video") }}
              className="w-full h-full"
              style={{ resizeMode: "cover" }}
            />
            <View className="absolute inset-0 items-center justify-center">
              <View className="w-16 h-16 rounded-full items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                <Text className="text-4xl">▶️</Text>
              </View>
            </View>
          </>
        ) : (
          <Text className="text-6xl">▶️</Text>
        )}
      </View>

      {/* Content section */}
      <View className="p-4">
        {/* Header */}
        <View className="flex-row items-center gap-3 mb-3">
          <View
            className="w-12 h-12 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.border }}
          >
            <Text className="text-2xl">{video.authorAvatar || "👤"}</Text>
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-sm" style={{ color: colors.foreground }}>
              {video.auteur}
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

        {/* Description */}
        {video.desc && (
          <Text className="text-sm mb-3" style={{ color: colors.muted }} numberOfLines={2}>
            {video.desc}
          </Text>
        )}

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
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToVideos((vids) => {
      setVideos(vids);
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
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {videos.length > 0 ? (
              videos.map((video) => <BuzzVideoCard key={video.id} video={video} />)
            ) : (
              <View className="flex-1 items-center justify-center">
                <Text className="text-lg font-semibold mb-2" style={{ color: colors.muted }}>
                  Aucune vidéo
                </Text>
                <Text className="text-sm" style={{ color: colors.muted }}>
                  Reviens plus tard !
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </ScreenContainer>
  );
}
