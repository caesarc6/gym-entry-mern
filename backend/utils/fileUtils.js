import crypto from "crypto";

/**
 * Sanitizes a filename for safe storage in Supabase
 * Removes special characters, spaces, and ensures valid format
 */
export const sanitizeFileName = (originalName) => {
  if (!originalName) {
    return `file_${Date.now()}`;
  }

  // Remove file extension first
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");

  // Replace spaces and special characters with underscores
  let sanitized = nameWithoutExt
    .replace(/[^a-zA-Z0-9]/g, "_") // Replace special chars with underscore
    .replace(/_+/g, "_") // Replace multiple underscores with single
    .replace(/^_|_$/g, ""); // Remove leading/trailing underscores

  // If sanitized name is empty, use a fallback
  if (!sanitized) {
    sanitized = "file";
  }

  // Limit length to avoid issues
  if (sanitized.length > 50) {
    sanitized = sanitized.substring(0, 50);
  }

  return sanitized;
};

/**
 * Generates a safe file path for Supabase storage
 */
export const generateSafeFilePath = (
  uid,
  originalFileName,
  folder = "images"
) => {
  const sanitizedFileName = sanitizeFileName(originalFileName);
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(4).toString("hex");

  return `${folder}/${uid}/${sanitizedFileName}_${timestamp}_${randomSuffix}.jpg`;
};

/**
 * Generates a unique file name with proper sanitization
 */
export const generateUniqueFileName = (originalName, uid) => {
  const sanitized = sanitizeFileName(originalName);
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(4).toString("hex");

  return `${sanitized}_${timestamp}_${randomSuffix}`;
};
