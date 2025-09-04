import {
  Container,
  SimpleGrid,
  Text,
  VStack,
  Button,
  useToast,
  Box,
  Progress,
} from "@chakra-ui/react";
import path from "path";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup } from "firebase/auth";

import { useState } from "react";
import { getAuth } from "firebase/auth";
import { handleImageUploadWithCompression } from "../utils/imageCompression";

function ProfilePictureUpload() {
  const [profilePictureUrl, setProfilePictureUrl] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const toast = useToast();

  const handleFileUpload = async (file) => {
    setIsProcessing(true);
    setError(null);

    try {
      // First compress the image if needed
      await handleImageUploadWithCompression(
        file,
        async (result) => {
          try {
            // Get current Firebase user
            const authResult = await signInWithPopup(auth, googleProvider);
            const token = await authResult.user.getIdToken();

            // Create FormData for file upload with compressed file
            const formData = new FormData();
            formData.append("profileImage", result.file, result.file.name);

            // Send to backend
            const res = await fetch(
              "https://gym-tracker-brown.vercel.app/api/upload/uploadProfilePic",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                body: formData,
              }
            );

            if (!res.ok) {
              const errorData = await res.json();
              console.error("Error response from server:", errorData);
              throw new Error(errorData.message || "Upload failed");
            }

            const data = await res.json();
            // Update state with new image URL
            setProfilePictureUrl(data.url);
            setError(null);

            // Show compression info if image was compressed
            if (result.wasCompressed) {
              toast({
                title: "Image Compressed",
                description: `Image compressed from ${result.originalSize} to ${result.compressedSize}`,
                status: "success",
                duration: 4000,
                isClosable: true,
              });
            }
          } catch (uploadError) {
            console.error("Upload failed", uploadError);
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
      console.error("File processing error:", error);
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
