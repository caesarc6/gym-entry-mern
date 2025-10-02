import imageCompression from "browser-image-compression";

/**
 * Image Compression Utility
 * Automatically compresses images larger than 5MB to reduce file size
 */

// Default compression options
const defaultOptions = {
  maxSizeMB: 5, // Maximum file size in MB
  maxWidthOrHeight: 1920, // Maximum width or height
  useWebWorker: true, // Use web worker for better performance
  fileType: "image/jpeg", // Output file type
  quality: 0.8, // Compression quality (0.8 = 80%)
};

/**
 * Compress image if it's larger than the specified size
 * @param {File} file - The image file to compress
 * @param {Object} options - Compression options
 * @returns {Promise<File>} - Compressed file or original file if no compression needed
 */
export const compressImageIfNeeded = async (file, options = {}) => {
  console.log("🔍 [COMPRESSION] Starting compression check");
  console.log("🔍 [COMPRESSION] File details:", {
    name: file.name,
    size: file.size,
    type: file.type,
  });

  const compressionOptions = { ...defaultOptions, ...options };
  const maxSizeBytes = compressionOptions.maxSizeMB * 1024 * 1024;

  console.log("🔍 [COMPRESSION] Compression options:", compressionOptions);
  console.log("🔍 [COMPRESSION] Max size bytes:", maxSizeBytes);

  // Check if file needs compression
  if (file.size <= maxSizeBytes) {
    console.log(
      "✅ [COMPRESSION] File size is within limits, no compression needed"
    );
    return file;
  }

  console.log(
    "🔍 [COMPRESSION] File exceeds size limit, starting compression..."
  );
  try {
    const compressedFile = await imageCompression(file, compressionOptions);

    const originalSize = (file.size / 1024 / 1024).toFixed(2);
    const compressedSize = (compressedFile.size / 1024 / 1024).toFixed(2);
    const compressionRatio = (
      (1 - compressedFile.size / file.size) *
      100
    ).toFixed(1);

    console.log("✅ [COMPRESSION] Compression completed:", {
      originalSize: `${originalSize}MB`,
      compressedSize: `${compressedSize}MB`,
      compressionRatio: `${compressionRatio}%`,
    });

    return compressedFile;
  } catch (error) {
    console.error("❌ [COMPRESSION] Image compression failed:", error);
    // Return original file if compression fails
    return file;
  }
};

/**
 * Compress image with custom quality settings
 * @param {File} file - The image file to compress
 * @param {number} quality - Compression quality (0.1 to 1.0)
 * @param {number} maxSizeMB - Maximum file size in MB
 * @returns {Promise<File>} - Compressed file
 */
export const compressImageWithQuality = async (
  file,
  quality = 0.8,
  maxSizeMB = 5
) => {
  const options = {
    ...defaultOptions,
    quality,
    maxSizeMB,
  };

  return compressImageIfNeeded(file, options);
};

/**
 * Get file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/**
 * Validate image file
 * @param {File} file - File to validate
 * @param {number} maxSizeMB - Maximum allowed size in MB
 * @returns {Object} - Validation result with success and message
 */
export const validateImageFile = (file, maxSizeMB = 5) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (!file) {
    return { success: false, message: "No file selected" };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      message:
        "Invalid file type. Please select a JPEG, PNG, GIF, or WebP image.",
    };
  }

  if (file.size > maxSizeBytes) {
    return {
      success: false,
      message: `File too large. Maximum size is ${maxSizeMB}MB. Current size: ${formatFileSize(
        file.size
      )}`,
    };
  }

  return { success: true, message: "File is valid" };
};

/**
 * Create a preview URL for an image file
 * @param {File} file - Image file
 * @returns {string} - Preview URL
 */
export const createImagePreview = (file) => {
  return URL.createObjectURL(file);
};

/**
 * Clean up preview URL to prevent memory leaks
 * @param {string} previewUrl - Preview URL to revoke
 */
export const cleanupImagePreview = (previewUrl) => {
  if (previewUrl && previewUrl.startsWith("blob:")) {
    URL.revokeObjectURL(previewUrl);
  }
};

/**
 * Enhanced file upload handler with compression
 * @param {File} file - File to process
 * @param {Function} onSuccess - Success callback
 * @param {Function} onError - Error callback
 * @param {Object} options - Compression options
 */
export const handleImageUploadWithCompression = async (
  file,
  onSuccess,
  onError,
  options = {}
) => {
  console.log("🔍 [IMAGE_COMPRESSION] Starting image upload with compression");
  console.log("🔍 [IMAGE_COMPRESSION] Input file:", {
    name: file.name,
    size: file.size,
    type: file.type,
  });
  console.log("🔍 [IMAGE_COMPRESSION] Options:", options);

  try {
    // Validate file first
    console.log("🔍 [IMAGE_COMPRESSION] Validating file...");
    const validation = validateImageFile(file, options.maxSizeMB || 5);
    console.log("🔍 [IMAGE_COMPRESSION] Validation result:", validation);

    if (!validation.success) {
      console.error(
        "❌ [IMAGE_COMPRESSION] File validation failed:",
        validation.message
      );
      onError(validation.message);
      return;
    }

    console.log("✅ [IMAGE_COMPRESSION] File validation passed");

    // Compress if needed
    console.log("🔍 [IMAGE_COMPRESSION] Starting compression process...");
    const processedFile = await compressImageIfNeeded(file, options);
    console.log("🔍 [IMAGE_COMPRESSION] Compression completed:", {
      originalSize: file.size,
      processedSize: processedFile.size,
      wasCompressed: file.size !== processedFile.size,
    });

    // Create preview
    console.log("🔍 [IMAGE_COMPRESSION] Creating preview URL...");
    const previewUrl = createImagePreview(processedFile);
    console.log("🔍 [IMAGE_COMPRESSION] Preview URL created:", previewUrl);

    // Call success callback with processed file and preview
    const result = {
      file: processedFile,
      preview: previewUrl,
      originalSize: formatFileSize(file.size),
      compressedSize: formatFileSize(processedFile.size),
      wasCompressed: file.size !== processedFile.size,
    };

    console.log(
      "✅ [IMAGE_COMPRESSION] Processing complete, calling success callback:",
      result
    );
    onSuccess(result);
  } catch (error) {
    console.error("❌ [IMAGE_COMPRESSION] Image processing failed:", error);
    onError("Failed to process image. Please try again.");
  }
};
