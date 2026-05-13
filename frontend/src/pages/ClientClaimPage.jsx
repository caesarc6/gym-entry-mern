import {
  Container,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Box,
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
  Card,
  CardBody,
  SimpleGrid,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from "@chakra-ui/react";
import { ButtonLoadingSpinner, LoadingIndicator } from "../components/loading";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase/supabase";
import { API_ENDPOINTS, apiClient } from "../config/api";
import { useCustomToast } from "../hooks/useCustomToast";
import { useThemeColors } from "../hooks/useThemeColors";
import { capitalizeName } from "../utils/nameUtils";
import { getCurrentAuthUser } from "../utils/auth";

// Convert Vite asset imports to actual URLs
const lightUrl = new URL("../assets/light.jpg", import.meta.url).href;
const nightUrl = new URL("../assets/night.jpg", import.meta.url).href;

const ClientClaimPage = () => {
  const { shareToken } = useParams();
  const [workouts, setWorkouts] = useState([]);
  const [creator, setCreator] = useState(null);
  const [clientName, setClientName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const toast = useCustomToast();
  const navigate = useNavigate();
  const colors = useThemeColors();
  const profileColorMode =
    colors.currentTheme === "light" ? lightUrl : nightUrl;
  const cancelRef = useRef();

  // Check authentication state
  useEffect(() => {
    const syncAuth = async () => {
      const authUser = await getCurrentAuthUser();
      setIsSignedIn(!!authUser);
      setUser(authUser);
    };

    syncAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          const mappedUser = {
            uid: session.user.id,
            email: session.user.email,
            name:
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.name ||
              session.user.email?.split("@")[0],
            picture:
              session.user.user_metadata?.avatar_url ||
              session.user.user_metadata?.picture ||
              "",
            authProvider: "supabase",
          };
          setIsSignedIn(true);
          setUser(mappedUser);
        } else {
          syncAuth();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Fetch client workouts data
  useEffect(() => {
    const fetchClientWorkouts = async () => {
      if (!shareToken) {
        setError("Invalid share link");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await apiClient.get(
          API_ENDPOINTS.GET_CLIENT_WORKOUTS_BY_TOKEN(shareToken)
        );

        if (response.data.success) {
          setWorkouts(response.data.data.workouts);
          setCreator(response.data.data.creator);
          setClientName(response.data.data.clientName);
        } else {
          throw new Error(
            response.data.message || "Failed to load client workouts"
          );
        }
      } catch (error) {
        setError(
          error.response?.data?.message || "Workouts not found or expired"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientWorkouts();
  }, [shareToken]);

  const handleClaimWorkouts = async () => {
    if (!isSignedIn) {
      navigate("/signup", {
        state: {
          from: `/client-claim/${shareToken}`,
        },
      });
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const handleConfirmClaim = async () => {
    setShowConfirmDialog(false);
    setIsClaiming(true);
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.CLAIM_CLIENT_WORKOUTS_BY_TOKEN(shareToken)
      );

      if (response.data.success) {
        toast.success(
          "Workouts claimed!",
          `Successfully claimed ${response.data.data.claimedCount} workout${
            response.data.data.claimedCount > 1 ? "s" : ""
          } to your account.`
        );
        // Redirect to user's profile or home page
        navigate("/profile");
      } else {
        throw new Error(response.data.message || "Failed to claim workouts");
      }
    } catch (error) {
      toast.error(
        "Claim failed",
        error.response?.data?.message ||
          "Unable to claim workouts to your account."
      );
    } finally {
      setIsClaiming(false);
    }
  };

  const handleSignIn = () => {
    navigate("/signup", {
      state: {
        from: `/client-claim/${shareToken}`,
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
            <LoadingIndicator variant="page" chakraColor="blue.500" />
            <Text>Loading workouts...</Text>
          </VStack>
        </Flex>
      </Container>
    );
  }

  if (error || !workouts || workouts.length === 0) {
    return (
      <Container maxW="container.lg" py={12}>
        <VStack spacing={6} textAlign="center">
          <Heading color="red.500">Workouts Not Found</Heading>
          <Text fontSize="lg" color={colors.textSecondary}>
            {error ||
              "These workouts could not be found or the link may have expired."}
          </Text>
          <Button as="a" href="/" colorScheme="blue">
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
                  {creator?.name || "Trainer"}
                </Text>
                {creator?.username && (
                  <Text fontSize="sm" color={colors.textMuted}>
                    @{creator.username}
                  </Text>
                )}
                <Text fontSize="sm" color={colors.textMuted}>
                  has shared {workouts.length} workout
                  {workouts.length > 1 ? "s" : ""} for you
                </Text>
              </VStack>
            </HStack>

            {/* Client Name and Workout Count */}
            <VStack spacing={2}>
              <Heading size="xl" textAlign="center" color={colors.textPrimary}>
                {capitalizeName(clientName)}'s Workouts
              </Heading>
              <Badge colorScheme="blue" variant="subtle" px={3} py={1}>
                {workouts.length} workout{workouts.length > 1 ? "s" : ""}
              </Badge>
            </VStack>
          </VStack>
        </Box>

        {/* Workouts List */}
        <Box
          w="full"
          bg={colors.bgCard}
          rounded="lg"
          shadow="lg"
          overflow="hidden"
          borderWidth={1}
          borderColor={colors.borderColor}
        >
          <Box p={8}>
            <VStack spacing={6} align="stretch">
              <Heading size="md" color={colors.textPrimary}>
                Workout Details ({workouts.length})
              </Heading>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                {workouts.map((workout) => (
                  <Card key={workout._id} bg={colors.bgMuted}>
                    <CardBody>
                      <VStack align="start" spacing={2}>
                        <Text fontWeight="bold" fontSize="md">
                          {workout.workoutName}
                        </Text>
                        <Text
                          fontSize="sm"
                          color={colors.textSecondary}
                          noOfLines={3}
                        >
                          {workout.description}
                        </Text>
                        <Text fontSize="xs" color={colors.textMuted}>
                          Created: {formatDate(workout.createdAt)}
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </SimpleGrid>
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
              Claim All Workouts?
            </Heading>
            <Text textAlign="center" color={colors.textSecondary} maxW="md">
              {isSignedIn
                ? `By claiming these workouts, you will add all ${
                    workouts.length
                  } workout${
                    workouts.length > 1 ? "s" : ""
                  } to your profile. They will appear in your profile page and you can start tracking your progress.`
                : `Sign up or sign in to claim all ${workouts.length} workout${
                    workouts.length > 1 ? "s" : ""
                  } to your account and start tracking your fitness progress.`}
            </Text>

            <HStack spacing={4}>
              {isSignedIn ? (
                <Button
                  colorScheme="blue"
                  size="lg"
                  onClick={handleClaimWorkouts}
                  isLoading={isClaiming}
                  spinner={<ButtonLoadingSpinner />}
                  loadingText="Claiming..."
                >
                  Claim All Workouts
                </Button>
              ) : (
                <>
                  <Button colorScheme="blue" size="lg" onClick={handleSignIn}>
                    Sign Up / Sign In
                  </Button>
                </>
              )}
            </HStack>

            <Text fontSize="sm" color={colors.textMuted} textAlign="center">
              By claiming these workouts, they will be added to your profile and
              you'll be able to track your progress.
            </Text>
          </VStack>
        </Box>
      </VStack>

      {/* Confirmation Dialog */}
      <AlertDialog
        isOpen={showConfirmDialog}
        leastDestructiveRef={cancelRef}
        onClose={() => setShowConfirmDialog(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Confirm Claiming Workouts
            </AlertDialogHeader>

            <AlertDialogBody>
              <VStack align="start" spacing={3}>
                <Text>
                  You are about to claim <strong>{workouts.length}</strong>{" "}
                  workout{workouts.length > 1 ? "s" : ""} to your account.
                </Text>
                <Text>
                  These workouts will be added to your profile page and you'll
                  be able to track your progress on them.
                </Text>
                <Text fontWeight="semibold" color="blue.600">
                  Are you sure you want to continue?
                </Text>
              </VStack>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button
                ref={cancelRef}
                onClick={() => setShowConfirmDialog(false)}
              >
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleConfirmClaim}
                ml={3}
                isLoading={isClaiming}
                spinner={<ButtonLoadingSpinner />}
                loadingText="Claiming..."
              >
                Yes, Claim All Workouts
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Container>
  );
};

export default ClientClaimPage;
