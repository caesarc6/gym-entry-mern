const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export const isAllowedImageUpload = (mimetype) =>
  ALLOWED_IMAGE_MIME_TYPES.has(
    String(mimetype || "").toLowerCase().split(";")[0].trim(),
  );

export const imageUploadFileFilter = (_req, file, cb) => {
  if (isAllowedImageUpload(file?.mimetype)) {
    cb(null, true);
    return;
  }
  cb(new Error("Invalid file type"), false);
};

/** Multipart fields arrive as strings. JSON updates may send a boolean. */
export const isExplicitImageClear = (value) =>
  value === true || value === "true" || value === "1";
