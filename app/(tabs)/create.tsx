import { ScrollView, Text, View, TouchableOpacity, Image, ActivityIndicator, TextInput, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";
import * as mediaPicker from "@/lib/media-picker";
import { uploadImageImageKit, uploadVideoCloudinary } from "@/lib/media-upload";
import { optimizeImageForUpload, optimizeVideoForUpload, validateMedia } from "@/lib/media-compression";
import { push, ref } from "firebase/database";
import db from "@/lib/firebase";

type MediaType = "photo" | "video" | null;

export default function CreateScreen() {
  const colors = useColors();
  const [selectedMedia, setSelectedMedia] = useState<mediaPicker.PickedMedia | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>(null);
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handlePickPhoto = async () => {
    const hasPermission = await mediaPicker.checkMediaLibraryPermission();
    if (!hasPermission) {
      const granted = await mediaPicker.requestMediaLibraryPermission();
      if (!granted) {
        Alert.alert("Permission refusée", "Nous avons besoin de l'accès à votre galerie");
        return;
      }
    }

    const media = await mediaPicker.pickImageFromGallery();
    if (media) {
      setSelectedMedia(media);
      setMediaType("photo");
    }
  };

  const handlePickVideo = async () => {
    const hasPermission = await mediaPicker.checkMediaLibraryPermission();
    if (!hasPermission) {
      const granted = await mediaPicker.requestMediaLibraryPermission();
      if (!granted) {
        Alert.alert("Permission refusée", "Nous avons besoin de l'accès à votre galerie");
        return;
      }
    }

    const media = await mediaPicker.pickVideoFromGallery();
    if (media) {
      setSelectedMedia(media);
      setMediaType("video");
    }
  };

  const handleTakePhoto = async () => {
    const hasPermission = await mediaPicker.checkCameraPermission();
    if (!hasPermission) {
      const granted = await mediaPicker.requestCameraPermission();
      if (!granted) {
        Alert.alert("Permission refusée", "Nous avons besoin de l'accès à votre caméra");
        return;
      }
    }

    const media = await mediaPicker.takeCameraPhoto();
    if (media) {
      setSelectedMedia(media);
      setMediaType("photo");
    }
  };

  const handleTakeVideo = async () => {
    const hasPermission = await mediaPicker.checkCameraPermission();
    if (!hasPermission) {
      const granted = await mediaPicker.requestCameraPermission();
      if (!granted) {
        Alert.alert("Permission refusée", "Nous avons besoin de l'accès à votre caméra");
        return;
      }
    }

    const media = await mediaPicker.takeCameraVideo();
    if (media) {
      setSelectedMedia(media);
      setMediaType("video");
    }
  };

  const handlePublish = async () => {
    if (!selectedMedia) {
      Alert.alert("Erreur", "Veuillez sélectionner une photo ou vidéo");
      return;
    }

    if (!description.trim()) {
      Alert.alert("Erreur", "Veuillez ajouter une description");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    // Valider le média
    const validation = validateMedia(selectedMedia);
    if (!validation.valid) {
      Alert.alert("Erreur", validation.errors.join("\n"));
      return;
    }

    try {
      let mediaUrl = "";
      let optimizedMedia = selectedMedia;

      if (mediaType === "photo") {
        // Optimiser l'image
        setUploadProgress(10);
        optimizedMedia = await optimizeImageForUpload(selectedMedia);
        setUploadProgress(20);

        // Upload photo vers ImageKit
        mediaUrl = await uploadImageImageKit(
          optimizedMedia as any,
          "posts",
          (progress) => setUploadProgress(Math.round(20 + progress * 0.7))
        );
      } else if (mediaType === "video") {
        // Optimiser la vidéo
        setUploadProgress(10);
        optimizedMedia = await optimizeVideoForUpload(selectedMedia);
        setUploadProgress(20);

        // Upload vidéo vers Cloudinary
        mediaUrl = await uploadVideoCloudinary(
          optimizedMedia as any,
          (progress) => setUploadProgress(Math.round(20 + progress * 0.7))
        );
      }

      // Sauvegarder dans Firebase
      const postsRef = ref(db, "posts");
      await push(postsRef, {
        type: mediaType,
        desc: description,
        [mediaType === "photo" ? "photoUrls" : "videoUrl"]: mediaType === "photo" ? [mediaUrl] : mediaUrl,
        auteur: "Utilisateur", // À remplacer par le vrai utilisateur
        authorUid: "user_123", // À remplacer par le vrai UID
        authorAvatar: "👤",
        likes: 0,
        shares: 0,
        createdAt: Date.now(),
      });

      Alert.alert("Succès", "Votre post a été publié !");
      setSelectedMedia(null);
      setMediaType(null);
      setDescription("");
      setUploadProgress(0);
    } catch (error) {
      console.error("Error publishing post:", error);
      Alert.alert("Erreur", "Une erreur est survenue lors de la publication");
    } finally {
      setUploading(false);
    }
  };

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
            Créer un post
          </Text>
          <TouchableOpacity
            className="px-3 py-2 rounded-lg"
            style={{ backgroundColor: colors.primary }}
            onPress={handlePublish}
            disabled={uploading || !selectedMedia}
          >
            <Text className="text-sm font-bold" style={{ color: colors.background }}>
              {uploading ? "⏳" : "Publier"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Media Preview */}
        {selectedMedia ? (
          <View className="px-4 py-4">
            <View
              className="rounded-2xl overflow-hidden aspect-video items-center justify-center mb-4"
              style={{ backgroundColor: colors.surface }}
            >
              {mediaType === "photo" ? (
                <Image
                  source={{ uri: selectedMedia.uri }}
                  className="w-full h-full"
                  style={{ resizeMode: "cover" }}
                />
              ) : (
                <View className="w-full h-full items-center justify-center" style={{ backgroundColor: colors.background }}>
                  <Text className="text-6xl mb-2">🎬</Text>
                  <Text className="text-sm" style={{ color: colors.muted }}>
                    Vidéo sélectionnée
                  </Text>
                </View>
              )}
            </View>

            {/* Upload Progress */}
            {uploading && (
              <View className="mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <Text style={{ color: colors.muted }}>Upload en cours...</Text>
                  <Text style={{ color: colors.primary }}>{uploadProgress}%</Text>
                </View>
                <View className="w-full h-2 rounded-full" style={{ backgroundColor: colors.border }}>
                  <View
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: colors.primary,
                      width: `${uploadProgress}%`,
                    }}
                  />
                </View>
              </View>
            )}

            {/* Description Input */}
            <TextInput
              placeholder="Ajoute une description..."
              placeholderTextColor={colors.muted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              editable={!uploading}
              className="p-4 rounded-lg mb-4"
              style={{
                backgroundColor: colors.surface,
                color: colors.foreground,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            />

            {/* Change Media Button */}
            <TouchableOpacity
              className="py-3 px-4 rounded-lg items-center"
              style={{ backgroundColor: colors.surface }}
              onPress={() => {
                setSelectedMedia(null);
                setMediaType(null);
                setDescription("");
              }}
              disabled={uploading}
            >
              <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
                Changer le média
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Media Selection Options */}
            <View className="px-4 py-6 gap-3">
              <Text className="text-lg font-semibold mb-2" style={{ color: colors.foreground }}>
                Sélectionner un média
              </Text>

              {/* Photo Options */}
              <View className="gap-2">
                <Text className="text-sm font-semibold" style={{ color: colors.muted }}>
                  📸 Photos
                </Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    className="flex-1 py-3 rounded-lg items-center"
                    style={{ backgroundColor: colors.surface }}
                    onPress={handlePickPhoto}
                  >
                    <Text className="text-sm font-semibold" style={{ color: colors.foreground }}>
                      Galerie
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 py-3 rounded-lg items-center"
                    style={{ backgroundColor: colors.surface }}
                    onPress={handleTakePhoto}
                  >
                    <Text className="text-sm font-semibold" style={{ color: colors.foreground }}>
                      Caméra
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Video Options */}
              <View className="gap-2">
                <Text className="text-sm font-semibold" style={{ color: colors.muted }}>
                  🎬 Vidéos
                </Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    className="flex-1 py-3 rounded-lg items-center"
                    style={{ backgroundColor: colors.surface }}
                    onPress={handlePickVideo}
                  >
                    <Text className="text-sm font-semibold" style={{ color: colors.foreground }}>
                      Galerie
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 py-3 rounded-lg items-center"
                    style={{ backgroundColor: colors.surface }}
                    onPress={handleTakeVideo}
                  >
                    <Text className="text-sm font-semibold" style={{ color: colors.foreground }}>
                      Caméra
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Info */}
              <View className="mt-4 p-3 rounded-lg" style={{ backgroundColor: colors.background }}>
                <Text className="text-xs" style={{ color: colors.muted }}>
                  💡 Conseil: Les photos et vidéos seront automatiquement optimisées pour une meilleure performance.
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
