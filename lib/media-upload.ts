// Configuration Cloudinary et ImageKit depuis le HTML
const CLOUDINARY_CONFIG = {
  cloudName: "dvmpv8pdi",
  uploadPreset: "kiko_videos",
};

const IMAGEKIT_CONFIG = {
  publicKey: "public_KikoMediaKit",
  urlEndpoint: "https://ik.imagekit.io/kiko",
  authenticationEndpoint: "https://kiko-api.example.com/auth",
};

const IMG_COMPRESS = {
  limitMB: 5,
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
};

// ═══════════════════════════════════════
// CLOUDINARY — Vidéos
// ═══════════════════════════════════════

export async function uploadVideoCloudinary(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  return new Promise((res, rej) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset);

    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/video/upload`
    );

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          res(response.secure_url);
        } catch (e) {
          rej(new Error("Failed to parse Cloudinary response"));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          rej(new Error(error?.error?.message || "Upload failed"));
        } catch {
          rej(new Error("Upload failed"));
        }
      }
    };

    xhr.onerror = () => rej(new Error("Network error"));
    xhr.send(formData);
  });
}

// ═══════════════════════════════════════
// IMAGEKIT — Images
// ═══════════════════════════════════════

export async function uploadImageImageKit(
  file: File,
  folder: string = "kiko",
  onProgress?: (progress: number) => void
): Promise<string> {
  return new Promise(async (res, rej) => {
    try {
      // Compresser l'image avant upload
      if (file.type.startsWith("image/")) {
        try {
          file = await compressImageFile(file);
        } catch (e) {
          console.warn("Image compression failed, uploading original");
        }
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", file.name);
      formData.append("folder", `/kiko/${folder}`);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "https://upload.imagekit.io/api/v1/files/upload");

      // Basic auth avec public key
      const auth = btoa(`${IMAGEKIT_CONFIG.publicKey}:`);
      xhr.setRequestHeader("Authorization", `Basic ${auth}`);

      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
      }

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status === 200) {
            res(data.url);
          } else {
            rej(new Error(data.message || "ImageKit upload failed"));
          }
        } catch (e) {
          rej(new Error("Failed to parse ImageKit response"));
        }
      };

      xhr.onerror = () => rej(new Error("Network error"));
      xhr.send(formData);
    } catch (error) {
      rej(error);
    }
  });
}

// ═══════════════════════════════════════
// COMPRESSION D'IMAGE
// ═══════════════════════════════════════

async function compressImageFile(file: File): Promise<File> {
  // Ne compresse que les images et seulement si au-dessus du seuil
  if (!file.type.startsWith("image/")) return file;
  if (file.size <= IMG_COMPRESS.limitMB * 1024 * 1024) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { naturalWidth: w, naturalHeight: h } = img;

      // Redimensionner si nécessaire
      if (w > IMG_COMPRESS.maxWidth || h > IMG_COMPRESS.maxHeight) {
        const ratio = Math.min(
          IMG_COMPRESS.maxWidth / w,
          IMG_COMPRESS.maxHeight / h
        );
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);

      const mime =
        file.type === "image/png" ? "image/png" : "image/jpeg";
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: mime,
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        mime,
        IMG_COMPRESS.quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════

export function getMediaUrl(
  url: string,
  type: "video" | "image" = "image",
  options?: { width?: number; height?: number; quality?: number }
): string {
  // Si c'est une URL Cloudinary
  if (url.includes("cloudinary.com")) {
    if (type === "video") return url;
    if (options?.width || options?.height) {
      const w = options.width || "auto";
      const h = options.height || "auto";
      const q = options.quality || 80;
      return url.replace("/upload/", `/upload/w_${w},h_${h},q_${q}/`);
    }
    return url;
  }

  // Si c'est une URL ImageKit
  if (url.includes("imagekit.io")) {
    if (options?.width || options?.height) {
      const params = new URLSearchParams();
      if (options.width) params.append("w", options.width.toString());
      if (options.height) params.append("h", options.height.toString());
      if (options.quality) params.append("q", options.quality.toString());
      return `${url}?${params.toString()}`;
    }
    return url;
  }

  return url;
}

export default {
  uploadVideoCloudinary,
  uploadImageImageKit,
  getMediaUrl,
};
