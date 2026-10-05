import sharp from "sharp";

const MAX_EDGE = {
  post: 1080,
  profile: 512,
  background: 1280,
};

/**
 * Re-encode an upload to the size the app actually shows.
 * Animated images stay as uploaded. A decode failure keeps the original bytes.
 */
export async function prepareStoredImage(
  buffer,
  role = "post",
  fallbackContentType = "image/jpeg"
) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return { buffer, contentType: fallbackContentType, extension: "jpg" };
  }

  const maxEdge = MAX_EDGE[role] || MAX_EDGE.post;

  try {
    const meta = await sharp(buffer, { animated: true, failOn: "none" }).metadata();
    if (meta.format === "gif" || (meta.pages && meta.pages > 1)) {
      return { buffer, contentType: "image/gif", extension: "gif" };
    }

    const output = await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize({
        width: maxEdge,
        height: maxEdge,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 78 })
      .toBuffer();

    return { buffer: output, contentType: "image/webp", extension: "webp" };
  } catch {
    return { buffer, contentType: fallbackContentType, extension: "jpg" };
  }
}
