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
  HStack,
  Badge,
  Box,
  Divider,
  useClipboard,
} from "@chakra-ui/react";
import { CopyIcon, ExternalLinkIcon, LinkIcon } from "@chakra-ui/icons";
import { useState } from "react";
import { API_ENDPOINTS, apiClient } from "../config/api";
import { useThemeColors } from "../hooks/useThemeColors";

const ShareableLinkModal = ({ isOpen, onClose, workout }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareData, setShareData] = useState(null);
  const toast = useToast();
  const colors = useThemeColors();

  const { hasCopied, onCopy } = useClipboard(shareData?.shareUrl || "");

  const handleGenerateLink = async () => {
    if (!workout) return;

    try {
      setIsGenerating(true);
      
      // Check if this is a client link request
      if (workout.isClientLink && workout.clientName) {
        const response = await apiClient.post(
          API_ENDPOINTS.GENERATE_CLIENT_SHAREABLE_LINK,
          { clientName: workout.clientName }
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
            title: "Client shareable link generated!",
            description: isDesktop
              ? `Your client link (${response.data.data.workoutCount} workouts) has been copied to clipboard and is ready to share.`
              : `Your client link (${response.data.data.workoutCount} workouts) is ready to share.`,
            status: "success",
            duration: 3000,
            isClosable: true,
          });
        } else {
          throw new Error(response.data.message || "Failed to generate link");
        }
      } else {
        // Single workout link
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
      <ModalContent bg={colors.bgCard} maxH="80vh">
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
              <Box p={4} bg={colors.bgMuted} borderRadius="md" borderWidth="1px" borderColor={colors.border}>
                <VStack align="start" spacing={2}>
                  {workout.isClientLink ? (
                    <>
                      <Text fontWeight="bold" fontSize="lg" color={colors.textPrimary}>
                        Client: {workout.clientName}
                      </Text>
                      <Text fontSize="sm" color={colors.textSecondary}>
                        Generate a link that will allow clients to claim all workouts
                        assigned to this client name.
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text fontWeight="bold" fontSize="lg" color={colors.textPrimary}>
                        {workout.workoutName}
                      </Text>
                      <Text fontSize="sm" color={colors.textSecondary} noOfLines={3}>
                        {workout.description}
                      </Text>
                      <HStack fontSize="xs" color={colors.textMuted}>
                        <Text>Client: {workout.clientName}</Text>
                        <Badge colorScheme="blue" size="sm">
                          {workout.totalShares || 0} shares
                        </Badge>
                      </HStack>
                    </>
                  )}
                </VStack>
              </Box>
            )}

            <Divider />

            {!shareData ? (
              <VStack spacing={4} align="stretch">
                <Text color={colors.textSecondary} textAlign="center">
                  {workout?.isClientLink
                    ? "Generate a shareable link that allows clients to claim all workouts assigned to this client name."
                    : "Generate a shareable link that allows clients to view and save this workout to their account."}
                </Text>
                <Box bg={colors.processBg} p={3} borderRadius="md" border="1px solid" borderColor={colors.border}>
                  <Text fontSize="sm" color={colors.textPrimary}>
                    💡 <strong>How it works:</strong>{" "}
                    {workout?.isClientLink
                      ? "When someone clicks your link, they can view all workouts and claim them all at once to their account if they're signed in."
                      : "When someone clicks your link, they can view the workout details and save it to their account if they're signed in."}
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
                  color={colors.textPrimary}
                >
                  ✅ Shareable link generated successfully!
                </Text>

                <VStack spacing={3}>
                  <Text fontSize="sm" fontWeight="semibold" color={colors.textPrimary}>
                    Share Link:
                  </Text>
                  <InputGroup>
                    <Input
                      value={shareData.shareUrl}
                      isReadOnly
                      fontSize="sm"
                      bg={colors.bgCard}
                      borderColor={colors.border}
                      color={colors.textPrimary}
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
                    <Text fontSize="xs" color={colors.textMuted}>
                      Test your link by opening it in a new tab
                    </Text>
                  </HStack>
                </VStack>

                <Box bg={colors.bgMuted} p={3} borderRadius="md" border="1px solid" borderColor={colors.border}>
                  <Text fontSize="sm" color={colors.textPrimary}>
                    ⏰ <strong>Expires:</strong>{" "}
                    {formatExpirationDate(shareData.expiresAt)}
                  </Text>
                </Box>

                <Box bg={colors.bgMuted} p={3} borderRadius="md" border="1px solid" borderColor={colors.border}>
                  <Text fontSize="sm" color={colors.textPrimary}>
                    <strong>Instructions for sharing:</strong>
                  </Text>
                  <Text fontSize="xs" color={colors.textSecondary} mt={1}>
                    1. Copy the link above
                    <br />
                    2. Send it to your client via text, email, or social media
                    <br />
                    3. Your client can view{" "}
                    {shareData?.workoutCount
                      ? `all ${shareData.workoutCount} workouts and claim them`
                      : "the workout and save it"}{" "}
                    to their account
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
