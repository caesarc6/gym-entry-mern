import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase";
import {
  Box,
  Heading,
  FormControl,
  FormLabel,
  Checkbox,
  Button,
  VStack,
  Text,
  Spinner,
  Divider,
  Alert,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
} from "@chakra-ui/react";
import { useColorMode } from "@chakra-ui/react";
import { apiClient, API_ENDPOINTS } from "../config/api";
import { useCustomToast } from "../hooks/useCustomToast";
import { useThemeColors } from "../hooks/useThemeColors";

const PrivacySettings = ({ isOpen, onClose, isModal = false }) => {
  const [privacySettings, setPrivacySettings] = useState({
    isPrivate: false,
    showEntries: true,
  });
  const [trainerDashboardAccess, setTrainerDashboardAccess] = useState({
    status: "none",
    hasAccess: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  const toast = useCustomToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { colorMode } = useColorMode();
  const colors = useThemeColors();

  useEffect(() => {
    const fetchPrivacySettings = async () => {
      const user = auth.currentUser;
      if (!user) {
        if (!isModal) {
          toast.error("Error", "You must be signed in to view this page.");
          navigate("/login");
        }
        return;
      }

      try {
        // Use apiClient instead of fetch to ensure proper token handling
        const response = await apiClient.get(
          API_ENDPOINTS.GET_CURRENT_MONGODB_USER
        );

        if (!response.data) throw new Error("Failed to fetch user data");
        const userData = response.data.data || response.data;
        setPrivacySettings({
          isPrivate: userData.privacy.isPrivate,
          showEntries: userData.privacy.showEntries,
        });

        // Fetch trainer dashboard access status
        try {
          const accessResponse = await apiClient.get(
            API_ENDPOINTS.CHECK_TRAINER_DASHBOARD_ACCESS
          );
          if (accessResponse.data.success) {
            setTrainerDashboardAccess({
              status: accessResponse.data.accessStatus || "none",
              hasAccess: accessResponse.data.hasAccess || false,
            });
          }
        } catch (accessError) {
          // Don't fail the whole page if this fails
        }
      } catch (error) {
        toast.error("Error", error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (isModal && isOpen) {
      // Fetch data when modal opens
      fetchPrivacySettings();
    } else if (!isModal) {
      // For page version, use auth state listener
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        if (!user) {
          toast.error("Error", "You must be signed in to view this page.");
          navigate("/login");
          return;
        }
        await fetchPrivacySettings();
      });
      return () => unsubscribe();
    }
  }, [isModal, isOpen, navigate, toast]);

  const handleChange = (e) => {
    const { name, checked } = e.target;
    setPrivacySettings((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");

      // Use apiClient instead of fetch to ensure proper token handling
      const response = await apiClient.put(
        API_ENDPOINTS.PRIVACY,
        privacySettings
      );

      if (!response.data) throw new Error("Failed to update privacy settings");
      const result = response.data;

      // Check if any follow requests were auto-approved
      if (result.autoApprovedRequests > 0) {
        toast.success(
          "Profile Updated & Follow Requests Approved",
          `Your profile is now public and ${
            result.autoApprovedRequests
          } pending follow request${
            result.autoApprovedRequests > 1 ? "s" : ""
          } ${
            result.autoApprovedRequests > 1 ? "have" : "has"
          } been automatically approved!`
        );

        // Notify other components that privacy settings were updated
        localStorage.setItem("privacySettingsUpdated", "true");
        // Trigger storage event for current window
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "privacySettingsUpdated",
            newValue: "true",
          })
        );
      } else {
        toast.success("Success", result.message);
      }

      // Close modal if it's a modal
      if (isModal && onClose) {
        onClose();
      }
    } catch (error) {
      toast.error("Error", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestTrainerDashboardAccess = async () => {
    setIsRequestingAccess(true);
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.REQUEST_TRAINER_DASHBOARD_ACCESS
      );

      if (response.data.success) {
        setTrainerDashboardAccess({
          status: response.data.accessStatus,
          hasAccess: response.data.accessStatus === "approved",
        });
        toast.success(
          "Success",
          response.data.accessStatus === "approved"
            ? "You already have trainer dashboard access!"
            : "Trainer dashboard access requested successfully. We'll review your request soon."
        );
      }
    } catch (error) {
      toast.error(
        "Error",
        error.response?.data?.message ||
          "Failed to request trainer dashboard access"
      );
    } finally {
      setIsRequestingAccess(false);
    }
  };

  const renderContent = () => (
    <VStack spacing={6} align="stretch">
      <Heading size="lg" color={colors.textPrimary}>
        Privacy Settings
      </Heading>
      <Text color={colors.textMuted}>
        Control who can see your profile and data.
      </Text>
      <form onSubmit={handleSubmit} style={{ width: "100%" }}>
        <VStack spacing={4}>
          <FormControl>
            <Checkbox
              name="isPrivate"
              isChecked={privacySettings.isPrivate}
              onChange={handleChange}
              colorScheme="blue"
              color={colors.textPrimary}
            >
              Private Profile
            </Checkbox>
            <FormLabel fontSize="sm" color={colors.textMuted} mt={1}>
              If checked, only approved followers can view your profile and
              posts.
            </FormLabel>
          </FormControl>
          <FormControl>
            <Checkbox
              name="showEntries"
              isChecked={privacySettings.showEntries}
              onChange={handleChange}
              colorScheme="blue"
              color={colors.textPrimary}
            >
              Show Entries
            </Checkbox>
            <FormLabel fontSize="sm" color={colors.textMuted} mt={1}>
              If checked, your posts will be visible to others (subject to
              profile privacy).
            </FormLabel>
          </FormControl>
          <Button
            type="submit"
            colorScheme="blue"
            isLoading={isSubmitting}
            width="full"
          >
            Save Changes
          </Button>
        </VStack>
      </form>

      <Divider my={6} borderColor={colors.borderColor} />

      {/* Trainer Dashboard Access Section */}
      <VStack spacing={4} align="stretch">
        <Heading size="md" color={colors.textPrimary}>
          Trainer Dashboard (Beta)
        </Heading>
        <Text fontSize="sm" color={colors.textMuted}>
          The trainer dashboard is currently in beta. Request access to use this
          feature.
        </Text>

        {trainerDashboardAccess.status === "approved" ? (
          <Alert status="success" borderRadius="md">
            <AlertIcon />
            <VStack align="start" spacing={1}>
              <Text fontWeight="semibold" color={colors.textPrimary}>
                You have trainer dashboard access!
              </Text>
              <Button
                size="sm"
                colorScheme="blue"
                onClick={() => {
                  if (isModal && onClose) onClose();
                  navigate("/trainer/dashboard");
                }}
              >
                Go to Trainer Dashboard
              </Button>
            </VStack>
          </Alert>
        ) : trainerDashboardAccess.status === "requested" ? (
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <VStack align="start" spacing={1}>
              <Text fontWeight="semibold" color={colors.textPrimary}>
                Access request pending review
              </Text>
              <Text fontSize="sm" color={colors.textMuted}>
                Your request for trainer dashboard access is being reviewed.
                We'll notify you once it's approved.
              </Text>
            </VStack>
          </Alert>
        ) : (
          <Button
            colorScheme="blue"
            variant="outline"
            isLoading={isRequestingAccess}
            onClick={handleRequestTrainerDashboardAccess}
            width="full"
          >
            Request Trainer Dashboard Access
          </Button>
        )}
      </VStack>
    </VStack>
  );

  // Modal version
  if (isModal) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="md"
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent bg={colors.bgCard} maxH="90vh">
          <ModalHeader color={colors.textPrimary} bg={colors.bgCard}>
            Privacy Settings
          </ModalHeader>
          <ModalCloseButton color={colors.textMuted} />
          <ModalBody bg={colors.bgCard}>
            {isLoading ? (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                py={8}
              >
                <Spinner size="xl" />
              </Box>
            ) : (
              renderContent()
            )}
          </ModalBody>
          <ModalFooter bg={colors.bgCard}>
            <Button
              onClick={onClose}
              color={colors.textPrimary}
              _hover={{ bg: colors.bgHover }}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  }

  // Page version (for route)
  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minH="100vh"
        bg={colorMode === "light" ? "gray.100" : "gray.800"}
      >
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <Box
      maxW="md"
      mx="auto"
      position="relative"
      top="130px"
      p={6}
      borderWidth={1}
      borderRadius="lg"
      bg={colorMode === "light" ? "white" : "gray.700"}
      boxShadow="md"
    >
      {renderContent()}
    </Box>
  );
};

export default PrivacySettings;
