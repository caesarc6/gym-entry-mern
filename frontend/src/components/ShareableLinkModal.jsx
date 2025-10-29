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
  Text,
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  Tooltip,
  useToast,
  useColorModeValue,
  HStack,
  Badge,
  Box,
  Divider,
  useClipboard,
} from "@chakra-ui/react";
import { CopyIcon, ExternalLinkIcon, LinkIcon } from "@chakra-ui/icons";
import { useState } from "react";
import { API_ENDPOINTS, apiClient } from "../config/api";

const ShareableLinkModal = ({ isOpen, onClose, workout }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareData, setShareData] = useState(null);
  const toast = useToast();
  const bgColor = useColorModeValue("white", "gray.800");
  const cardBg = useColorModeValue("gray.50", "gray.700");

  const { hasCopied, onCopy } = useClipboard(shareData?.shareUrl || "");

  const handleGenerateLink = async () => {
    if (!workout) return;

    try {
      setIsGenerating(true);
      const response = await apiClient.post(
        API_ENDPOINTS.GENERATE_SHAREABLE_LINK(workout._id)
      );

      if (response.data.success) {
        setShareData(response.data.data);

        // Auto-copy to clipboard on desktop devices
        const isDesktop = window.innerWidth >= 768; // Desktop breakpoint
        if (isDesktop) {
          // Use a small delay to ensure the clipboard hook is updated
          setTimeout(() => {
            onCopy();
          }, 100);
        }

        toast({
          title: "Shareable link generated!",
          description: isDesktop
            ? "Your workout link has been copied to clipboard and is ready to share."
            : "Your workout link is ready to share.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error(response.data.message || "Failed to generate link");
      }
    } catch (error) {
      console.error("Error generating shareable link:", error);
      toast({
        title: "Error generating link",
        description:
          error.response?.data?.message || "Failed to generate shareable link",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    onCopy();
    toast({
      title: "Link copied!",
      description: "The shareable link has been copied to your clipboard.",
      status: "success",
      duration: 2000,
      isClosable: true,
    });
  };

  const handleClose = () => {
    setShareData(null);
    onClose();
  };

  const formatExpirationDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" isCentered>
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent bg={bgColor} maxH="80vh">
        <ModalHeader>
          <HStack spacing={2}>
            <LinkIcon color="blue.500" />
            <Text>Share Workout</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody overflowY="auto">
          <VStack spacing={6} align="stretch">
            {workout && (
              <Box p={4} bg={cardBg} borderRadius="md" borderWidth="1px">
                <VStack align="start" spacing={2}>
                  <Text fontWeight="bold" fontSize="lg">
                    {workout.workoutName}
                  </Text>
                  <Text fontSize="sm" color="gray.600" noOfLines={3}>
                    {workout.description}
                  </Text>
                  <HStack fontSize="xs" color="gray.500">
                    <Text>Client: {workout.clientName}</Text>
                    <Badge colorScheme="blue" size="sm">
                      {workout.totalShares || 0} shares
                    </Badge>
                  </HStack>
                </VStack>
              </Box>
            )}

            <Divider />

            {!shareData ? (
              <VStack spacing={4} align="stretch">
                <Text color="gray.600" textAlign="center">
                  Generate a shareable link that allows clients to view and save
                  this workout to their account.
                </Text>
                <Box bg="blue.50" p={3} borderRadius="md">
                  <Text fontSize="sm" color="blue.800">
                    💡 <strong>How it works:</strong> When someone clicks your
                    link, they can view the workout details and save it to their
                    account if they're signed in.
                  </Text>
                </Box>
                <Button
                  colorScheme="blue"
                  size="lg"
                  onClick={handleGenerateLink}
                  isLoading={isGenerating}
                  loadingText="Generating Link..."
                  leftIcon={<LinkIcon />}
                >
                  Generate Shareable Link
                </Button>
              </VStack>
            ) : (
              <VStack spacing={4} align="stretch">
                <Text
                  fontWeight="semibold"
                  textAlign="center"
                  color="green.600"
                >
                  ✅ Shareable link generated successfully!
                </Text>

                <VStack spacing={3}>
                  <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                    Share Link:
                  </Text>
                  <InputGroup>
                    <Input
                      value={shareData.shareUrl}
                      isReadOnly
                      fontSize="sm"
                      bg="white"
                      borderColor="gray.300"
                    />
                    <InputRightElement>
                      <Tooltip label={hasCopied ? "Copied!" : "Copy link"}>
                        <IconButton
                          icon={<CopyIcon />}
                          onClick={handleCopyLink}
                          colorScheme={hasCopied ? "green" : "blue"}
                          variant="outline"
                          size="sm"
                          aria-label="Copy link"
                        />
                      </Tooltip>
                    </InputRightElement>
                  </InputGroup>
                </VStack>

                <VStack spacing={2}>
                  <HStack spacing={2}>
                    <Tooltip label="Open link in new tab">
                      <IconButton
                        icon={<ExternalLinkIcon />}
                        onClick={() =>
                          window.open(shareData.shareUrl, "_blank")
                        }
                        colorScheme="blue"
                        variant="outline"
                        size="sm"
                        aria-label="Open link"
                      />
                    </Tooltip>
                    <Text fontSize="xs" color="gray.500">
                      Test your link by opening it in a new tab
                    </Text>
                  </HStack>
                </VStack>

                <Box bg="yellow.50" p={3} borderRadius="md">
                  <Text fontSize="sm" color="yellow.800">
                    ⏰ <strong>Expires:</strong>{" "}
                    {formatExpirationDate(shareData.expiresAt)}
                  </Text>
                </Box>

                <Box bg="gray.50" p={3} borderRadius="md">
                  <Text fontSize="sm" color="gray.700">
                    <strong>Instructions for sharing:</strong>
                  </Text>
                  <Text fontSize="xs" color="gray.600" mt={1}>
                    1. Copy the link above
                    <br />
                    2. Send it to your client via text, email, or social media
                    <br />
                    3. Your client can view the workout and save it to their
                    account
                    <br />
                    4. The link will be valid for 30 days
                  </Text>
                </Box>
              </VStack>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose}>
            Close
          </Button>
          {shareData && (
            <Button colorScheme="blue" onClick={handleCopyLink}>
              {hasCopied ? "Copied!" : "Copy Link"}
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ShareableLinkModal;
