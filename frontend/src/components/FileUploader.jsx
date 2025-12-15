// import { useRef } from "react";
// import "../index.css";

// export const FileUploader = ({ handleFile, accept = "image/*" }) => {
//   const hiddenFileInput = useRef(null);

//   const handleClick = (e) => {
//     e.preventDefault(); // Prevent form submission
//     hiddenFileInput.current.click();
//   };

//   const handleChange = (event) => {
//     const fileUploaded = event.target.files[0];
//     if (fileUploaded) {
//       handleFile(fileUploaded);
//     }
//   };

//   return (
//     <>
//       <button className="button-upload" onClick={handleClick} type="button">
//         Upload Image
//       </button>
//       <input
//         type="file"
//         onChange={handleChange}
//         ref={hiddenFileInput}
//         accept={accept}
//         style={{ display: "none" }}
//       />
//     </>
//   );
// };

// FileUploader.js
import { useRef, useState } from "react";
import {
  Button,
  Text,
  VStack,
  HStack,
  Progress,
  useColorModeValue,
  Box,
  Badge,
} from "@chakra-ui/react";
import { useCustomToast } from "../hooks/useCustomToast";
import {
  handleImageUploadWithCompression,
  formatFileSize,
} from "../utils/imageCompression";
import "../index.css";

export const FileUploader = ({
  handleFile,
  maxSizeMB = 5,
  showCompressionInfo = true,
}) => {
  const hiddenFileInput = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState(null);
  const toast = useCustomToast();
  const bgColor = useColorModeValue("gray.50", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  const handleClick = (e) => {
    e.preventDefault(); // Prevent form submission
    e.stopPropagation(); // Prevent event bubbling
    hiddenFileInput.current.click();
  };

  const handleChange = async (event) => {
    const fileUploaded = event.target.files[0];
    if (!fileUploaded) {
      return;
    }

    setIsProcessing(true);
    setCompressionInfo(null);

    try {
      await handleImageUploadWithCompression(
        fileUploaded,
        (result) => {
          // Success callback

          handleFile(result.file);
          setCompressionInfo(result);

          if (result.wasCompressed && showCompressionInfo) {
            toast.success(
              "Image Compressed",
              `Image compressed from ${result.originalSize} to ${result.compressedSize}`
            );
          }

          setIsProcessing(false);
        },
        (error) => {
          // Error callback
          toast.error("Upload Error", error);
          setIsProcessing(false);
        },
        { maxSizeMB }
      );
    } catch (error) {
      setIsProcessing(false);
    }
  };

  return (
    <VStack spacing={3} align="stretch">
      <Button
        className="button-upload"
        onClick={handleClick}
        type="button"
        isLoading={isProcessing}
        loadingText="Processing..."
        isDisabled={isProcessing}
        colorScheme="blue"
        variant="outline"
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {isProcessing ? "Processing Image..." : "Add Image"}
      </Button>

      <input
        type="file"
        onChange={handleChange}
        ref={hiddenFileInput}
        accept="image/*"
        style={{ display: "none" }}
      />

      {/* Compression Info */}
      {compressionInfo && showCompressionInfo && (
        <Box
          p={3}
          bg={bgColor}
          borderRadius="md"
          border="1px solid"
          borderColor={borderColor}
        >
          <VStack spacing={2} align="start">
            <Text fontSize="sm" fontWeight="medium">
              Image Processing Complete
            </Text>
            <HStack spacing={4}>
              <Badge colorScheme="blue" variant="subtle">
                Original: {compressionInfo.originalSize}
              </Badge>
              <Badge colorScheme="green" variant="subtle">
                Final: {compressionInfo.compressedSize}
              </Badge>
              {compressionInfo.wasCompressed && (
                <Badge colorScheme="orange" variant="subtle">
                  Compressed
                </Badge>
              )}
            </HStack>
          </VStack>
        </Box>
      )}

      {/* Processing Progress */}
      {isProcessing && (
        <Box>
          <Text fontSize="sm" mb={2}>
            Processing image...
          </Text>
          <Progress size="sm" isIndeterminate colorScheme="blue" />
        </Box>
      )}
    </VStack>
  );
};
