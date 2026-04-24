import {
  Text,
  VStack,
  Box,
  Progress,
} from "@chakra-ui/react";
import { useCustomToast } from "../hooks/useCustomToast";
import { useState } from "react";
import { handleImageUploadWithCompression } from "../utils/imageCompression";
import { apiClient, API_ENDPOINTS } from "../config/api";
import { getCurrentAuthUser } from "../utils/auth";
import { FileUploader } from "../components/FileUploader";

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
      <FileUploader
        handleFile={handleFileUpload}
        maxSizeMB={5}
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
