import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabase/supabase";
import {
  Box,
  Heading,
  FormControl,
  FormLabel,
  Checkbox,
  Button,
  VStack,
  Text,
  Divider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
} from "@chakra-ui/react";
import { ButtonLoadingSpinner, LoadingIndicator } from "./loading";
import { useColorMode } from "@chakra-ui/react";
import { apiClient, API_ENDPOINTS } from "../config/api";
import { useCustomToast } from "../hooks/useCustomToast";
import { useThemeColors } from "../hooks/useThemeColors";
import { getCurrentAuthUser } from "../utils/auth";

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
  const toast = useCustomToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { colorMode } = useColorMode();
  const colors = useThemeColors();

  useEffect(() => {
    const fetchPrivacySettings = async () => {
      const user = await getCurrentAuthUser();
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
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          if (!session?.user) {
            toast.error("Error", "You must be signed in to view this page.");
            navigate("/login");
            return;
          }
          await fetchPrivacySettings();
        }
      );
      return () => subscription.unsubscribe();
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
      const user = await getCurrentAuthUser();
      if (!user) throw new Error("User not authenticated");

      // Use apiClient instead of fetch to ensure proper token handling
      const response = await apiClient.put(
        API_ENDPOINTS.PRIVACY,
        privacySettings
      );

      if (!response.data) throw new Error("Failed to update privacy settings");
      const result = response.data;

      if (result.autoApprovedRequests > 0) {
        localStorage.setItem("privacySettingsUpdated", "true");
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "privacySettingsUpdated",
            newValue: "true",
          })
        );
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

  const showTrainerAccess =
    trainerDashboardAccess.status === "approved" ||
    trainerDashboardAccess.status === "requested";

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
              workouts.
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
              If checked, your workouts will be visible to others (subject to
              profile privacy).
            </FormLabel>
          </FormControl>
          <Button
            type="submit"
            colorScheme="blue"
            isLoading={isSubmitting}
            spinner={<ButtonLoadingSpinner />}
            width="full"
          >
            Save Changes
          </Button>
        </VStack>
      </form>

      {showTrainerAccess ? (
        <>
          <Divider my={6} borderColor={colors.borderColor} />
          <VStack spacing={4} align="stretch">
            <Heading size="md" color={colors.textPrimary}>
              Trainer dashboard
            </Heading>
            {trainerDashboardAccess.status === "approved" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (isModal && onClose) onClose();
                  navigate("/trainer/dashboard");
                }}
              >
                Open trainer dashboard
              </Button>
            ) : (
              <Text fontSize="sm" color={colors.textMuted}>
                Your trainer access request is still in review.
              </Text>
            )}
          </VStack>
        </>
      ) : null}
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
                <LoadingIndicator variant="page" />
              </Box>
            ) : (
              renderContent()
            )}
          </ModalBody>
          <ModalFooter bg={colors.bgCard}>
            <Button
              onClick={onClose}
              variant="outline"
              borderRadius="full"
              fontWeight="500"
              color={colors.textPrimary}
              borderColor={colors.borderColor}
              _hover={{ bg: colors.bgHover, borderColor: colors.borderColorInput }}
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
        <LoadingIndicator variant="page" />
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
