import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";

export interface PickedMedia {
  uri: string;
  type: "photo" | "video";
  fileName: string;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null; // en millisecondes pour vidéos
}

// ═══════════════════════════════════════
// GALERIE — Sélectionner des médias
// ═══════════════════════════════════════

export async function pickImageFromGallery(): Promise<PickedMedia | null> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 1,
    });

    if (result.canceled) return null;

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      type: "photo",
      fileName: asset.fileName || `photo_${Date.now()}.jpg`,
      fileSize: asset.fileSize,
      width: asset.width,
      height: asset.height,
    };
  } catch (error) {
    console.error("Error picking image:", error);
    return null;
  }
}

export async function pickVideoFromGallery(): Promise<PickedMedia | null> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 1,
    });

    if (result.canceled) return null;

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      type: "video",
      fileName: asset.fileName || `video_${Date.now()}.mp4`,
      fileSize: asset.fileSize,
      width: asset.width,
      height: asset.height,
      duration: asset.duration,
    };
  } catch (error) {
    console.error("Error picking video:", error);
    return null;
  }
}

export async function pickMultipleImages(): Promise<PickedMedia[]> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (result.canceled) return [];

    return result.assets.map((asset) => ({
      uri: asset.uri,
      type: "photo" as const,
      fileName: asset.fileName || `photo_${Date.now()}.jpg`,
      fileSize: asset.fileSize || undefined,
      width: asset.width || undefined,
      height: asset.height || undefined,
    }));
  } catch (error) {
    console.error("Error picking multiple images:", error);
    return [];
  }
}

// ═══════════════════════════════════════
// CAMÉRA — Capturer des photos/vidéos
// ═══════════════════════════════════════

export async function takeCameraPhoto(): Promise<PickedMedia | null> {
  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 1,
    });

    if (result.canceled) return null;

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      type: "photo",
      fileName: asset.fileName || `camera_photo_${Date.now()}.jpg`,
      fileSize: asset.fileSize,
      width: asset.width,
      height: asset.height,
    };
  } catch (error) {
    console.error("Error taking photo:", error);
    return null;
  }
}

export async function takeCameraVideo(): Promise<PickedMedia | null> {
  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 1,
      videoMaxDuration: 300, // 5 minutes max
    });

    if (result.canceled) return null;

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      type: "video",
      fileName: asset.fileName || `camera_video_${Date.now()}.mp4`,
      fileSize: asset.fileSize || undefined,
      width: asset.width || undefined,
      height: asset.height || undefined,
      duration: asset.duration || undefined,
    };
  } catch (error) {
    console.error("Error taking video:", error);
    return null;
  }
}

// ═══════════════════════════════════════
// PERMISSIONS
// ═══════════════════════════════════════

export async function requestCameraPermission(): Promise<boolean> {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.error("Error requesting camera permission:", error);
    return false;
  }
}

export async function requestMediaLibraryPermission(): Promise<boolean> {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.error("Error requesting media library permission:", error);
    return false;
  }
}

export async function checkCameraPermission(): Promise<boolean> {
  try {
    const { status } = await ImagePicker.getCameraPermissionsAsync();
    return status === "granted";
  } catch (error) {
    return false;
  }
}

export async function checkMediaLibraryPermission(): Promise<boolean> {
  try {
    const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
    return status === "granted";
  } catch (error) {
    return false;
  }
}

// ═══════════════════════════════════════
// SAUVEGARDE DANS LA GALERIE
// ═══════════════════════════════════════

export async function saveMediaToGallery(uri: string, type: "photo" | "video"): Promise<boolean> {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") return false;

    if (type === "photo") {
      await MediaLibrary.saveToLibraryAsync(uri);
    } else {
      await MediaLibrary.saveToLibraryAsync(uri);
    }
    return true;
  } catch (error) {
    console.error("Error saving to gallery:", error);
    return false;
  }
}

export default {
  pickImageFromGallery,
  pickVideoFromGallery,
  pickMultipleImages,
  takeCameraPhoto,
  takeCameraVideo,
  requestCameraPermission,
  requestMediaLibraryPermission,
  checkCameraPermission,
  checkMediaLibraryPermission,
  saveMediaToGallery,
};
