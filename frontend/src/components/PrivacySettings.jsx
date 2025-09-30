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
} from "@chakra-ui/react";
import { useColorMode } from "@chakra-ui/react";

const PrivacySettings = () => {
  const [privacySettings, setPrivacySettings] = useState({
    isPrivate: false,
    showEntries: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        const token = await user.getIdToken();
        const response = await fetch(
          "http://localhost:5001/api/getCurrentMongoDBUser",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) throw new Error("Failed to fetch user data");
        const userData = await response.json();
        setPrivacySettings({
          isPrivate: userData.privacy.isPrivate,
          showEntries: userData.privacy.showEntries,
        });
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

      const token = await user.getIdToken();
      const response = await fetch("http://localhost:5001/api/privacy", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(privacySettings),
      });

      if (!response.ok) throw new Error("Failed to update privacy settings");
      const result = await response.json();

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
      </VStack>
    </Box>
  );
};

export default PrivacySettings;
