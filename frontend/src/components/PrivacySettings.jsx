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
  useToast,
  VStack,
  Text,
  Spinner,
  Divider,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { useColorMode } from "@chakra-ui/react";
import { apiClient, API_ENDPOINTS } from "../config/api";

const PrivacySettings = () => {
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
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { colorMode } = useColorMode();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        toast({
          title: "Error",
          description: "You must be signed in to view this page.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        navigate("/login");
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
          console.error("Error fetching trainer dashboard access:", accessError);
          // Don't fail the whole page if this fails
        }
      } catch (error) {
        console.error("Error fetching privacy settings:", error);
        toast({
          title: "Error",
          description: error.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    });

    // Cleanup the listener on component unmount
    return () => unsubscribe();
  }, [navigate, toast]);

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
        toast({
          title: "Profile Updated & Follow Requests Approved",
          description: `Your profile is now public and ${
            result.autoApprovedRequests
          } pending follow request${
            result.autoApprovedRequests > 1 ? "s" : ""
          } ${
            result.autoApprovedRequests > 1 ? "have" : "has"
          } been automatically approved!`,
          status: "success",
          duration: 7000,
          isClosable: true,
        });

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
        toast({
          title: "Success",
          description: result.message,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error updating privacy settings:", error);
      toast({
        title: "Error",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
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
        toast({
          title: "Success",
          description:
            response.data.accessStatus === "approved"
              ? "You already have trainer dashboard access!"
              : "Trainer dashboard access requested successfully. We'll review your request soon.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error requesting trainer dashboard access:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message ||
          "Failed to request trainer dashboard access",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsRequestingAccess(false);
    }
  };

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
      <VStack spacing={6}>
        <Heading size="lg">Privacy Settings</Heading>
        <Text>Control who can see your profile and data.</Text>
        <form onSubmit={handleSubmit} style={{ width: "100%" }}>
          <VStack spacing={4}>
            <FormControl>
              <Checkbox
                name="isPrivate"
                isChecked={privacySettings.isPrivate}
                onChange={handleChange}
                colorScheme="blue"
              >
                Private Profile
              </Checkbox>
              <FormLabel fontSize="sm" color="gray.500" mt={1}>
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
              >
                Show Entries
              </Checkbox>
              <FormLabel fontSize="sm" color="gray.500" mt={1}>
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

        <Divider my={6} />

        {/* Trainer Dashboard Access Section */}
        <VStack spacing={4} align="stretch">
          <Heading size="md">Trainer Dashboard (Beta)</Heading>
          <Text fontSize="sm" color="gray.500">
            The trainer dashboard is currently in beta. Request access to use
            this feature.
          </Text>

          {trainerDashboardAccess.status === "approved" ? (
            <Alert status="success" borderRadius="md">
              <AlertIcon />
              <VStack align="start" spacing={1}>
                <Text fontWeight="semibold">
                  You have trainer dashboard access!
                </Text>
                <Button
                  size="sm"
                  colorScheme="blue"
                  onClick={() => navigate("/trainer/dashboard")}
                >
                  Go to Trainer Dashboard
                </Button>
              </VStack>
            </Alert>
          ) : trainerDashboardAccess.status === "requested" ? (
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <VStack align="start" spacing={1}>
                <Text fontWeight="semibold">
                  Access request pending review
                </Text>
                <Text fontSize="sm">
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
    </Box>
  );
};

export default PrivacySettings;
