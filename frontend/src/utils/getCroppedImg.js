/**
 * Draw an image region (from react-easy-crop pixelCrop) onto a canvas and return a File.
 */
export function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image for cropping."));
    img.src = src;
  });
}

/**
 * @param {string} imageSrc - Blob URL or data URL
 * @param {{ x: number; y: number; width: number; height: number }} pixelCrop
 * @param {string} [originalName]
 * @returns {Promise<File>}
 */
export async function getCroppedImgAsFile(imageSrc, pixelCrop, originalName = "") {
  const image = await loadImageElement(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not crop image.");
  }

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  const mimeType = "image/jpeg";
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) reject(new Error("Cropping produced an empty image."));
        else resolve(b);
      },
      mimeType,
      0.92
    );
  });

  const base =
    String(originalName || `cropped-${Date.now()}`)
      .replace(/\.[a-z0-9]+$/i, "")
      .slice(0, 120) || "profile";
  return new File([blob], `${base}.jpg`, {
    type: mimeType,
    lastModified: Date.now(),
  });
}
