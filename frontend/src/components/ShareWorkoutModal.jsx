import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  VStack,
  HStack,
  Text,
  Input,
  Textarea,
  useColorModeValue,
  Box,
  IconButton,
  Tooltip,
  Badge,
  Divider,
  Link,
  useDisclosure,
} from "@chakra-ui/react";
import { ButtonLoadingSpinner } from "./loading";
import { useState } from "react";
import { CopyIcon, ExternalLinkIcon } from "@chakra-ui/icons";
import { FiShare2 } from "react-icons/fi";
import { API_ENDPOINTS, apiClient } from "../config/api";
import { useCustomToast } from "../hooks/useCustomToast";

const ShareWorkoutModal = ({ isOpen, onClose, entry, onShareGenerated }) => {
  const [shareUrl, setShareUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const toast = useCustomToast();
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  const handleGenerateShareLink = async () => {
    if (!entry || !entry._id) {
      toast({
        title: "Error",
        description: "No workout selected to share",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.SHARE_WORKOUT(entry._id)
      );

      if (response.data.success) {
        const { shareUrl: generatedUrl, expiryDate } = response.data.data;
        setShareUrl(generatedUrl);

        toast.success(
          "Share link generated!",
          `Link expires on ${new Date(expiryDate).toLocaleDateString()}`
        );

        if (onShareGenerated) {
          onShareGenerated(generatedUrl);
        }
      } else {
        throw new Error(
          response.data.message || "Failed to generate share link"
        );
      }
    } catch (error) {
      toast.error(
        "Error",
        error.response?.data?.message || "Failed to generate share link"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      toast({
        title: "Link copied!",
        description: "Share link has been copied to your clipboard",
        status: "success",
        duration: 2000,
        isClosable: true,
      });

      // Reset copied state after 2 seconds
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast.error("Copy failed", "Could not copy link to clipboard");
    }
  };

  const handleClose = () => {
    setShareUrl("");
    setIsCopied(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalOverlay />
      <ModalContent bg={bgColor}>
        <ModalHeader>
          <HStack spacing={2}>
            <FiShare2 />
            <Text>Share Workout</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            {/* Workout Preview */}
            {entry && (
              <Box
                p={4}
                borderWidth={1}
                borderColor={borderColor}
                borderRadius="md"
              >
                <VStack spacing={2} align="start">
                  <Text fontWeight="bold" fontSize="lg">
                    {entry.name}
                  </Text>
                  <Text fontSize="sm" color="gray.500" noOfLines={3}>
                    {entry.description}
                  </Text>
                  <Badge colorScheme="blue" variant="subtle">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </Badge>
                </VStack>
              </Box>
            )}

            <Divider />

            {/* Share Instructions */}
            <VStack spacing={3} align="start">
              <Text fontWeight="semibold">How to share:</Text>
              <Text fontSize="sm" color="gray.600">
                1. Generate a shareable link for this workout
              </Text>
              <Text fontSize="sm" color="gray.600">
                2. Send the link to anyone you want to share the workout with
              </Text>
              <Text fontSize="sm" color="gray.600">
                3. Recipients can view the workout and save it to their account
              </Text>
            </VStack>

            {/* Generate Share Link Section */}
            <VStack spacing={3}>
              <Button
                onClick={handleGenerateShareLink}
                isLoading={isGenerating}
                spinner={<ButtonLoadingSpinner />}
                loadingText="Generating..."
                colorScheme="blue"
                leftIcon={<FiShare2 />}
                size="lg"
                w="full"
                isDisabled={!entry || !entry._id}
              >
                {shareUrl ? "Generate New Link" : "Generate Share Link"}
              </Button>

              {/* Share URL Display */}
              {shareUrl && (
                <Box
                  w="full"
                  p={4}
                  bg="gray.50"
                  borderRadius="md"
                  borderWidth={1}
                  borderColor={borderColor}
                >
                  <VStack spacing={3}>
                    <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                      Share Link:
                    </Text>
                    <HStack w="full" spacing={2}>
                      <Input
                        value={shareUrl}
                        isReadOnly
                        fontSize="sm"
                        bg="white"
                        borderColor={borderColor}
                      />
                      <Tooltip label={isCopied ? "Copied!" : "Copy link"}>
                        <IconButton
                          icon={isCopied ? <CopyIcon /> : <CopyIcon />}
                          onClick={handleCopyLink}
                          colorScheme={isCopied ? "green" : "blue"}
                          variant="outline"
                          size="md"
                        />
                      </Tooltip>
                      <Tooltip label="Open link in new tab">
                        <IconButton
                          icon={<ExternalLinkIcon />}
                          onClick={() => window.open(shareUrl, "_blank")}
                          colorScheme="blue"
                          variant="outline"
                          size="md"
                        />
                      </Tooltip>
                    </HStack>
                    <Text fontSize="xs" color="gray.500" textAlign="center">
                      This link will be valid for 30 days
                    </Text>
                  </VStack>
                </Box>
              )}
            </VStack>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button onClick={handleClose} variant="ghost">
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ShareWorkoutModal;
