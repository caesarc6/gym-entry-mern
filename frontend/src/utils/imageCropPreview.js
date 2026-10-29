const EXTENSION_MIME = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

/** Formats WKWebView / Chrome can feed straight to react-easy-crop. */
const SAFE_CROP_PREVIEW_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/**
 * Cap HEIC / fallback rasterization. Final compress already targets ~1080,
 * so the cropper does not need a full-resolution bitmap.
 */
const CROP_PREVIEW_MAX_EDGE = 1600;
const CROP_PREVIEW_JPEG_QUALITY = 0.82;

/**
 * Infer a MIME type from a File name and optional Capacitor `photo.format`.
 */
export function inferImageMimeType(file, formatHint) {
  const fromFile = file?.type;
  if (fromFile && fromFile.startsWith("image/")) {
    return fromFile;
  }

  const hint = String(formatHint || "")
    .toLowerCase()
    .replace(/^image\//, "");
  if (hint && EXTENSION_MIME[hint]) {
    return EXTENSION_MIME[hint];
  }

  const match = String(file?.name || "").match(/\.([a-z0-9]+)$/i);
  if (match) {
    const ext = match[1].toLowerCase();
    if (EXTENSION_MIME[ext]) {
      return EXTENSION_MIME[ext];
    }
  }

  return "image/jpeg";
}

function fileWithMime(file, mimeType) {
  if (!file || file.type === mimeType) {
    return file;
  }
  return new File([file], file.name || `photo-${Date.now()}.jpg`, {
    type: mimeType,
    lastModified: file.lastModified || Date.now(),
  });
}

async function rasterizeToJpegFile(
  file,
  {
    maxEdge = CROP_PREVIEW_MAX_EDGE,
    quality = CROP_PREVIEW_JPEG_QUALITY,
  } = {}
) {
  if (typeof createImageBitmap !== "function") {
    throw new Error("Could not decode image for cropping.");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const maxDim = Math.max(bitmap.width, bitmap.height);
    const scale = maxDim > maxEdge ? maxEdge / maxDim : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not decode image for cropping.");
    }
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (!b) reject(new Error("Could not decode image for cropping."));
          else resolve(b);
        },
        "image/jpeg",
        quality
      );
    });

    const base = String(file.name || `photo-${Date.now()}`)
      .replace(/\.[a-z0-9]+$/i, "")
      .slice(0, 120);
    return new File([blob], `${base || "photo"}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close?.();
  }
}

/**
 * Ensure the file and blob URL work with react-easy-crop in WKWebView (HEIC, missing MIME).
 *
 * JPEG/PNG/WebP: return a blob URL immediately (no decode wait) so the crop
 * modal can paint. HEIC/unknown: rasterize once, downscaled for a lighter crop UI.
 *
 * @returns {Promise<{ file: File; previewUrl: string }>}
 */
export async function ensureFilePreviewForCrop(file, formatHint) {
  const mimeType = inferImageMimeType(file, formatHint);
  let normalized = fileWithMime(file, mimeType);

  if (SAFE_CROP_PREVIEW_TYPES.has(normalized.type)) {
    return {
      file: normalized,
      previewUrl: URL.createObjectURL(normalized),
    };
  }

  try {
    normalized = await rasterizeToJpegFile(normalized);
    return {
      file: normalized,
      previewUrl: URL.createObjectURL(normalized),
    };
  } catch (rasterErr) {
    // Rare path: try the raw blob; if an <img> can load it, use it.
    const { loadImageElement } = await import("./getCroppedImg");
    const previewUrl = URL.createObjectURL(normalized);
    try {
      await loadImageElement(previewUrl);
      return { file: normalized, previewUrl };
    } catch {
      URL.revokeObjectURL(previewUrl);
      throw rasterErr instanceof Error
        ? rasterErr
        : new Error("Could not prepare this photo for cropping.");
    }
  }
}
