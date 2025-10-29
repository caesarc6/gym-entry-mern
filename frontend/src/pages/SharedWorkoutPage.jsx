import {
  Container,
  VStack,
  HStack,
  Text,
  Heading,
  Image,
  Button,
  Box,
  Spinner,
  useToast,
  Avatar,
  Badge,
  Divider,
  Flex,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { API_ENDPOINTS, apiClient } from "../config/api";
import { useCustomToast } from "../hooks/useCustomToast";
import { useThemeColors } from "../hooks/useThemeColors";
import light from "../assets/light.jpg";
import night from "../assets/night.jpg";
import defaultBg from "../assets/defaultBg.jpg";
import defaultBgNight from "../assets/defaultBgNight.jpg";

// Convert Vite asset imports to actual URLs
const lightUrl = new URL("../assets/light.jpg", import.meta.url).href;
const nightUrl = new URL("../assets/night.jpg", import.meta.url).href;
const defaultBgUrl = new URL("../assets/defaultBg.jpg", import.meta.url).href;
const defaultBgNightUrl = new URL(
  "../assets/defaultBgNight.jpg",
  import.meta.url
).href;

const SharedWorkoutPage = () => {
  const { shareToken } = useParams();
  const [workout, setWorkout] = useState(null);
  const [creator, setCreator] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  const toast = useCustomToast();
  const navigate = useNavigate();
  const colors = useThemeColors();
  const profileColorMode =
    colors.currentTheme === "light" ? lightUrl : nightUrl;
  const bgColorMode =
    colors.currentTheme === "light" ? defaultBgUrl : defaultBgNightUrl;

  const {
    isOpen: isSignInModalOpen,
    onOpen: onSignInModalOpen,
    onClose: onSignInModalClose,
  } = useDisclosure();

  // Check authentication state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsSignedIn(!!user);
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  // Fetch shared workout data
  useEffect(() => {
    const fetchSharedWorkout = async () => {
      if (!shareToken) {
        setError("Invalid share link");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await apiClient.get(
          API_ENDPOINTS.GET_SHARED_WORKOUT_BY_TOKEN(shareToken)
        );

        if (response.data.success) {
          setWorkout(response.data.data.sharedWorkout);
          setCreator(response.data.data.creator);
        } else {
          throw new Error(
            response.data.message || "Failed to load shared workout"
          );
        }
      } catch (error) {
        console.error("Error fetching shared workout:", error);
        setError(
          error.response?.data?.message || "Workout not found or expired"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchSharedWorkout();
  }, [shareToken]);

  const handleSaveWorkout = async () => {
    if (!isSignedIn) {
      onSignInModalOpen();
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.SAVE_SHARED_WORKOUT_BY_TOKEN(shareToken)
      );

      if (response.data.success) {
        toast.success(
          "Workout saved!",
          "This workout has been saved to your account."
        );
        // Redirect to user's profile or home page
        navigate("/profile");
      } else {
        throw new Error(response.data.message || "Failed to save workout");
      }
    } catch (error) {
      console.error("Error saving workout:", error);
      toast.error(
        "Save failed",
        error.response?.data?.message ||
          "Unable to save workout to your account."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignIn = () => {
    // Pass the current shared workout URL as the redirect path
    navigate("/signup", {
      state: {
        from: `/shared-workout/${shareToken}`,
      },
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <Container maxW="container.lg" py={12}>
        <Flex justify="center" align="center" minH="400px">
          <VStack spacing={4}>
            <Spinner size="xl" color="blue.500" />
            <Text>Loading shared workout...</Text>
          </VStack>
        </Flex>
      </Container>
    );
  }

  if (error || !workout) {
    return (
      <Container maxW="container.lg" py={12}>
        <VStack spacing={6} textAlign="center">
          <Heading color="red.500">Workout Not Found</Heading>
          <Text fontSize="lg" color={colors.textSecondary}>
            {error ||
              "This shared workout could not be found or may have expired."}
          </Text>
          <Button as={Link} to="/" colorScheme="blue">
            Go to Home
          </Button>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="container.lg" py={12}>
      <VStack spacing={8}>
        {/* Header Section */}
        <Box
          w="full"
          bg={colors.bgCard}
          p={8}
          rounded="lg"
          shadow="lg"
          borderWidth={1}
          borderColor={colors.borderColor}
        >
          <VStack spacing={6}>
            {/* Creator Info */}
            <HStack spacing={4} w="full" justify="center">
              <Avatar
                size="lg"
                src={creator?.picture || profileColorMode}
                name={creator?.name || "Creator"}
              />
              <VStack align="start" spacing={1}>
                <Text
                  fontWeight="bold"
                  fontSize="lg"
                  color={colors.textPrimary}
                >
                  {creator?.name || workout?.creatorName || "Trainer"}
                </Text>
                {creator?.username && (
                  <Text fontSize="sm" color={colors.textMuted}>
                    @{creator.username}
                  </Text>
                )}
                <Text fontSize="sm" color={colors.textMuted}>
                  shared this workout
                </Text>
              </VStack>
            </HStack>

            {/* Workout Title */}
            <VStack spacing={2}>
              <Heading size="xl" textAlign="center" color={colors.textPrimary}>
                {workout.workoutName}
              </Heading>
              <Badge colorScheme="blue" variant="subtle" px={3} py={1}>
                {formatDate(workout.createdAt)}
              </Badge>
            </VStack>
          </VStack>
        </Box>

        {/* Workout Content */}
        <Box
          w="full"
          bg={colors.bgCard}
          rounded="lg"
          shadow="lg"
          overflow="hidden"
          borderWidth={1}
          borderColor={colors.borderColor}
        >
          {/* Workout Image */}
          {workout.image && (
            <Image
              src={workout.image}
              alt={workout.workoutName}
              w="full"
              h="400px"
              objectFit="cover"
            />
          )}

          {/* Workout Description */}
          <Box p={8}>
            <VStack spacing={6} align="stretch">
              <Heading size="md" color={colors.textPrimary}>
                Workout Details
              </Heading>
              <Text
                fontSize="lg"
                lineHeight="1.6"
                whiteSpace="pre-wrap"
                color={colors.textDesc}
              >
                {workout.description}
              </Text>

              <Divider />

              {/* Client Info */}
              {workout.clientName && (
                <HStack spacing={8} justify="center">
                  <VStack spacing={1}>
                    <Text
                      fontWeight="bold"
                      fontSize="lg"
                      color={colors.textPrimary}
                    >
                      Client
                    </Text>
                    <Text fontSize="sm" color={colors.textMuted}>
                      {workout.clientName}
                    </Text>
                  </VStack>
                </HStack>
              )}
            </VStack>
          </Box>
        </Box>

        {/* Action Section */}
        <Box
          w="full"
          bg={colors.bgCard}
          p={8}
          rounded="lg"
          shadow="lg"
          borderWidth={1}
          borderColor={colors.borderColor}
        >
          <VStack spacing={6}>
            <Heading size="md" textAlign="center" color={colors.textPrimary}>
              Want to save this workout?
            </Heading>
            <Text textAlign="center" color={colors.textSecondary} maxW="md">
              {isSignedIn
                ? "Save this workout to your account to track your progress and build your fitness journey."
                : "Sign up or sign in to save this workout to your account and start tracking your fitness progress."}
            </Text>

            <HStack spacing={4}>
              {isSignedIn ? (
                <Button
                  colorScheme="blue"
                  size="lg"
                  onClick={handleSaveWorkout}
                  isLoading={isSaving}
                  loadingText="Saving..."
                >
                  Save to My Account
                </Button>
              ) : (
                <>
                  <Button colorScheme="blue" size="lg" onClick={handleSignIn}>
                    Sign Up / Sign In
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={onSignInModalOpen}
                  >
                    Learn More
                  </Button>
                </>
              )}
            </HStack>

            <Text fontSize="sm" color={colors.textMuted} textAlign="center">
              By saving this workout, you'll be able to track your progress and
              build upon it.
            </Text>
          </VStack>
        </Box>
      </VStack>

      {/* Sign In Modal */}
      <Modal isOpen={isSignInModalOpen} onClose={onSignInModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Save This Workout</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Text>
                To save this workout to your account, you'll need to sign up or
                sign in.
              </Text>
              <Text fontSize="sm" color={colors.textSecondary}>
                Don't worry - it's free and takes just a minute!
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={handleSignIn} mr={3}>
              Get Started
            </Button>
            <Button variant="ghost" onClick={onSignInModalClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default SharedWorkoutPage;
