import { loadImageElement } from "./getCroppedImg";

const EXTENSION_MIME = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

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

async function rasterizeToJpegFile(file) {
  if (typeof createImageBitmap !== "function") {
    throw new Error("Could not decode image for cropping.");
  }
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    throw new Error("Could not decode image for cropping.");
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) reject(new Error("Could not decode image for cropping."));
        else resolve(b);
      },
      "image/jpeg",
      0.92
    );
  });

  const base = String(file.name || `photo-${Date.now()}`)
    .replace(/\.[a-z0-9]+$/i, "")
    .slice(0, 120);
  return new File([blob], `${base || "photo"}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

/**
 * Ensure the file and blob URL work with react-easy-crop in WKWebView (HEIC, missing MIME).
 * @returns {Promise<{ file: File; previewUrl: string }>}
 */
export async function ensureFilePreviewForCrop(file, formatHint) {
  const mimeType = inferImageMimeType(file, formatHint);
  let normalized = fileWithMime(file, mimeType);
  let previewUrl = URL.createObjectURL(normalized);

  try {
    await loadImageElement(previewUrl);
    return { file: normalized, previewUrl };
  } catch {
    URL.revokeObjectURL(previewUrl);
  }

  normalized = await rasterizeToJpegFile(normalized);
  previewUrl = URL.createObjectURL(normalized);
  await loadImageElement(previewUrl);
  return { file: normalized, previewUrl };
}
