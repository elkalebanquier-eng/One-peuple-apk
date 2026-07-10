import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { PickedMedia } from "./media-picker";

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: SaveFormat;
}

export interface VideoCompressionOptions {
  maxBitrate?: number; // en kbps
  maxResolution?: {
    width: number;
    height: number;
  };
}

// ═══════════════════════════════════════
// COMPRESSION D'IMAGES
// ═══════════════════════════════════════

const DEFAULT_IMAGE_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
  format: SaveFormat.JPEG,
};

export async function compressImage(
  media: PickedMedia,
  options: CompressionOptions = {}
): Promise<PickedMedia> {
  if (media.type !== "photo") return media;

  const opts = { ...DEFAULT_IMAGE_OPTIONS, ...options };

  try {
    // Déterminer les dimensions redimensionnées
    let width = media.width || opts.maxWidth!;
    let height = media.height || opts.maxHeight!;

    if (width > opts.maxWidth! || height > opts.maxHeight!) {
      const ratio = Math.min(opts.maxWidth! / width, opts.maxHeight! / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    // Compresser l'image
    const result = await manipulateAsync(media.uri, [{ resize: { width, height } }], {
      compress: opts.quality,
      format: opts.format,
    });

    return {
      ...media,
      uri: result.uri,
      width,
      height,
    };
  } catch (error) {
    console.error("Error compressing image:", error);
    return media;
  }
}

export async function compressMultipleImages(
  medias: PickedMedia[],
  options: CompressionOptions = {}
): Promise<PickedMedia[]> {
  return Promise.all(medias.map((media) => compressImage(media, options)));
}

// ═══════════════════════════════════════
// OPTIMISATION POUR UPLOAD
// ═══════════════════════════════════════

export async function optimizeImageForUpload(media: PickedMedia): Promise<PickedMedia> {
  // Compresser pour upload
  return compressImage(media, {
    maxWidth: 1280,
    maxHeight: 1920,
    quality: 0.75,
    format: SaveFormat.JPEG,
  });
}

export async function optimizeVideoForUpload(media: PickedMedia): Promise<PickedMedia> {
  // Pour les vidéos, on retourne le média tel quel
  // La compression vidéo se fera côté serveur via Cloudinary
  if (media.type !== "video") return media;

  // Vérifier la taille
  const maxVideoSize = 500 * 1024 * 1024; // 500 MB
  if (media.fileSize && media.fileSize > maxVideoSize) {
    console.warn("Video size exceeds 500MB, upload may fail");
  }

  return media;
}

// ═══════════════════════════════════════
// ESTIMATION DE TAILLE
// ═══════════════════════════════════════

export function estimateCompressedSize(media: PickedMedia): number {
  if (!media.fileSize) return 0;

  if (media.type === "photo") {
    // Les images compressées sont généralement 30-50% de la taille originale
    return Math.round(media.fileSize * 0.4);
  } else {
    // Les vidéos sont généralement 40-60% de la taille originale
    return Math.round(media.fileSize * 0.5);
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

// ═══════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateMedia(media: PickedMedia): ValidationResult {
  const errors: string[] = [];

  if (media.type === "photo") {
    // Vérifier la taille des images
    if (media.fileSize && media.fileSize > 100 * 1024 * 1024) {
      errors.push("L'image est trop volumineuse (max 100 MB)");
    }

    // Vérifier les dimensions
    if (media.width && media.height) {
      const minDimension = 200;
      if (media.width < minDimension || media.height < minDimension) {
        errors.push(`L'image doit faire au moins ${minDimension}x${minDimension}px`);
      }
    }
  } else if (media.type === "video") {
    // Vérifier la taille des vidéos
    if (media.fileSize && media.fileSize > 500 * 1024 * 1024) {
      errors.push("La vidéo est trop volumineuse (max 500 MB)");
    }

    // Vérifier la durée
    if (media.duration) {
      const maxDuration = 5 * 60 * 1000; // 5 minutes
      if (media.duration > maxDuration) {
        errors.push("La vidéo doit faire moins de 5 minutes");
      }

      const minDuration = 1000; // 1 seconde
      if (media.duration < minDuration) {
        errors.push("La vidéo doit faire au moins 1 seconde");
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ═══════════════════════════════════════
// INFOS MÉDIA
// ═══════════════════════════════════════

export function getMediaInfo(media: PickedMedia): string {
  const parts: string[] = [];

  if (media.type === "photo") {
    if (media.width && media.height) {
      parts.push(`${media.width}x${media.height}px`);
    }
  } else if (media.type === "video") {
    if (media.duration) {
      const seconds = Math.round(media.duration / 1000);
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      parts.push(`${minutes}:${secs.toString().padStart(2, "0")}`);
    }
  }

  if (media.fileSize) {
    parts.push(formatFileSize(media.fileSize));
  }

  return parts.join(" • ");
}

export default {
  compressImage,
  compressMultipleImages,
  optimizeImageForUpload,
  optimizeVideoForUpload,
  estimateCompressedSize,
  formatFileSize,
  validateMedia,
  getMediaInfo,
};
