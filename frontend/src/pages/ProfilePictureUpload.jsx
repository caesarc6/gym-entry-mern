import {
  Container,
  SimpleGrid,
  Text,
  VStack,
  Button,
  Box,
  Progress,
} from "@chakra-ui/react";
import { useCustomToast } from "../hooks/useCustomToast";
import { useState } from "react";
import { handleImageUploadWithCompression } from "../utils/imageCompression";
import { apiClient, API_ENDPOINTS } from "../config/api";
import { getCurrentAuthUser } from "../utils/auth";

function ProfilePictureUpload() {
  const [profilePictureUrl, setProfilePictureUrl] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const toast = useCustomToast();

  const handleFileUpload = async (file) => {
    setIsProcessing(true);
    setError(null);

    try {
      // First compress the image if needed
      await handleImageUploadWithCompression(
        file,
        async (result) => {
          try {
            const user = await getCurrentAuthUser();
            if (!user) {
              throw new Error("You must be signed in to upload a profile photo.");
            }

            // Create FormData for file upload with compressed file
            const formData = new FormData();
            formData.append("profileImage", result.file, result.file.name);

            // Send to backend
            const res = await apiClient.post(
              API_ENDPOINTS.UPLOAD_PROFILE_PIC,
              formData
            );

            const data = res.data;
            if (!data?.url) {
              throw new Error(data?.message || "Upload failed");
            }
            // Update state with new image URL
            setProfilePictureUrl(data.url);
            setError(null);

            // Show compression info if image was compressed
            if (result.wasCompressed) {
              toast.success(
                "Image Compressed",
                `Image compressed from ${result.originalSize} to ${result.compressedSize}`
              );
            }
          } catch (uploadError) {
            setError(uploadError.message || "Upload failed");
          } finally {
            setIsProcessing(false);
          }
        },
        (compressionError) => {
          // Error callback for compression
          setError(compressionError);
          setIsProcessing(false);
        },
        { maxSizeMB: 5 }
      );
    } catch (error) {
      setError("Failed to process image. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <VStack spacing={4} align="stretch">
      <input
        type="file"
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) {
            handleFileUpload(file);
          }
        }}
        accept="image/*"
        disabled={isProcessing}
        className="mb-4 mt-4 p-2 border border-gray-600 rounded w-full max-w-sm text-center cursor-pointer hover:bg-slate-700 hover:text-white transition-colors duration-300 ease-in-out text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-slate-700 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
      />

      {isProcessing && (
        <Box>
          <Text fontSize="sm" mb={2}>
            Processing image...
          </Text>
          <Progress size="sm" isIndeterminate colorScheme="blue" />
        </Box>
      )}

      {profilePictureUrl && (
        <img src={profilePictureUrl} alt="Profile" className="mt-4" />
      )}

      {error && (
        <Text color="red.500" fontSize="sm">
          {error}
        </Text>
      )}
    </VStack>
  );
}

export default ProfilePictureUpload;
