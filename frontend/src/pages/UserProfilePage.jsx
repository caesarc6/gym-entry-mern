import {
  useToast,
  Container,
  SimpleGrid,
  Text,
  VStack,
  Button,
  Heading,
  Avatar,
  Center,
  Flex,
  Spinner,
  Box,
} from "@chakra-ui/react";
import { Stack, Image } from "@chakra-ui/react";
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { SlArrowRight, SlArrowLeft } from "react-icons/sl";
import ProductCard from "../components/ProductCard";
import light from "../assets/light.jpg";
import night from "../assets/night.jpg";
import defaultBg from "../assets/defaultBg.jpg";
import defaultBgNight from "../assets/defaultBgNight.jpg";
import { useThemeColors } from "../hooks/useThemeColors";

// Convert Vite asset imports to actual URLs
const lightUrl = new URL("../assets/light.jpg", import.meta.url).href;
const nightUrl = new URL("../assets/night.jpg", import.meta.url).href;
const defaultBgUrl = new URL("../assets/defaultBg.jpg", import.meta.url).href;
const defaultBgNightUrl = new URL(
  "../assets/defaultBgNight.jpg",
  import.meta.url
).href;
import { API_ENDPOINTS, apiClient } from "../config/api";
import PaginationComponent from "../components/Pagination";

const UserProfilePage = () => {
  const { userId: paramUserId } = useParams(); // Rename to avoid confusion
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState({
    name: "",
    username: "",
    goal: "",
    gymName: "",
    postsCount: 0,
    profileImage: "",
    backgroundPicture: "",
    bio: "",
    followersCount: 0,
    followingCount: 0,
    isPrivate: false,
  });
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [hasFollowRequest, setHasFollowRequest] = useState(false);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  const [isFollowingLoadingInitial, setIsFollowingLoadingInitial] =
    useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(6);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalPosts: 0,
    limit: 6,
  });

  const toast = useToast();
  const colors = useThemeColors();
  const profileColorMode =
    colors.currentTheme === "light" ? lightUrl : nightUrl;
  const bgColorMode =
    colors.currentTheme === "light" ? defaultBgUrl : defaultBgNightUrl;

  // Determine userId: use paramUserId if available, otherwise use current user's UID
  const userId = paramUserId || auth.currentUser?.uid;

  // Check follow status and request status
  const checkFollowStatus = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user || user.uid === userId) return;

      const response = await apiClient.get(
        API_ENDPOINTS.FOLLOW_REQUEST_STATUS(userId)
      );
      const followStatusData = response.data;
      setIsFollowing(followStatusData.isFollowing || false);
      setHasFollowRequest(followStatusData.hasRequest || false);
    } catch (error) {
      console.error("Error checking follow status:", error);
    }
  }, [userId]);

  // Listen for storage events to refresh follow status when privacy settings change
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "privacySettingsUpdated" && e.newValue === "true") {
        // Privacy settings were updated, refresh follow status
        checkFollowStatus();
        // Clear the flag
        localStorage.removeItem("privacySettingsUpdated");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [checkFollowStatus]);

  const fetchUserProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Fetch user profile data
      const profileResponse = await apiClient.get(
        API_ENDPOINTS.GET_USER_PROFILE(userId)
      );
      const profileData = profileResponse.data;

      const userData = profileData.data.user;

      const finalProfileImage =
        userData.picture || userData.profileImage || profileColorMode;

      setUserProfile({
        name: userData.name || "Name",
        username: userData.username || userData.name || "Username",
        goal: userData.goal || "Not set",
        gymName: userData.gymName || "Not specified",
        postsCount: profileData.data.postsCount || 0,
        bio: userData.bio || "No bio available",
        profileImage: finalProfileImage,
        backgroundPicture: userData.backgroundPicture || bgColorMode,
        followersCount: profileData.data.followersCount || 0,
        followingCount: profileData.data.followingCount || 0,
        isPrivate: userData.isPrivate || false,
      });

      // Check if current user is following this profile and follow request status
      if (user && user.uid !== userId) {
        const followStatusResponse = await apiClient.get(
          API_ENDPOINTS.FOLLOW_REQUEST_STATUS(userId)
        );
        const followStatusData = followStatusResponse.data;
        setIsFollowing(followStatusData.isFollowing || false);
        setHasFollowRequest(followStatusData.hasRequest || false);
        setIsFollowingLoadingInitial(false);
      } else {
        setIsFollowing(false);
        setHasFollowRequest(false);
        setIsFollowingLoadingInitial(false);
      }

      // Only fetch posts if the profile is public OR if the current user is following OR if it's the user's own profile
      const shouldFetchPosts =
        !userData.isPrivate || isFollowing || user.uid === userId;

      if (shouldFetchPosts) {
        const postsResponse = await apiClient.get(
          API_ENDPOINTS.POSTS(userId, currentPage, limit)
        );
        const postsData = postsResponse.data;

        if (postsData.success) {
          // Normalize posts to match ProductCard expectations
          const normalizedEntries = postsData.data.map((post) => ({
            _id: post._id,
            name: post.name || "Untitled",
            description: post.description || "No description",
            image: post.image || null,
            likes: Array.isArray(post.likes) ? post.likes : [],
            comments: Array.isArray(post.comments) ? post.comments : [],
            createdAt: post.createdAt || new Date().toISOString(),
            uid: post.uid || userId, // ProductCard expects 'uid' field
            ownerId: post.uid || userId,
          }));
          setEntries(normalizedEntries);
          setPagination(postsData.pagination);
        }
      } else {
        // For private profiles that we can't see posts for, set empty entries
        setEntries([]);
        setPagination({
          currentPage: 1,
          totalPages: 0,
          totalPosts: 0,
          limit: 6,
        });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load profile",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    userId,
    currentPage,
    limit,
    toast,
    profileColorMode,
    bgColorMode,
    isFollowing,
  ]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsAuthLoading(false);
        fetchUserProfile();
      } else {
        setIsAuthLoading(false);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchUserProfile]);

  const handleFollow = async () => {
    try {
      setIsFollowingLoading(true);
      const user = auth.currentUser;
      if (!user) throw new Error("You need to sign in to follow users");

      if (isFollowing) {
        // Unfollow logic
        const response = await apiClient.post(API_ENDPOINTS.UNFOLLOW(userId));
        const data = response.data;

        if (data.message === "Unfollowed successfully") {
          setIsFollowing(false);
          setHasFollowRequest(false);
          setUserProfile((prev) => ({
            ...prev,
            followersCount: prev.followersCount - 1,
          }));
          toast({
            title: "Success",
            description: `You have unfollowed ${userProfile.name}`,
            status: "success",
            duration: 5000,
            isClosable: true,
          });
        }
      } else if (hasFollowRequest) {
        // Cancel follow request
        const response = await apiClient.delete(
          API_ENDPOINTS.FOLLOW_REQUEST(userId)
        );
        const data = response.data;

        if (data.success) {
          setHasFollowRequest(false);
          toast({
            title: "Follow Request Cancelled",
            description: `Follow request to ${userProfile.name} has been cancelled`,
            status: "info",
            duration: 5000,
            isClosable: true,
          });
        }
      } else {
        // Send follow request
        const response = await apiClient.post(
          API_ENDPOINTS.FOLLOW_REQUEST(userId)
        );
        const data = response.data;

        if (data.isFollowing) {
          // Direct follow (public profile)
          setIsFollowing(true);
          setHasFollowRequest(false);
          setUserProfile((prev) => ({
            ...prev,
            followersCount: prev.followersCount + 1,
          }));
          toast({
            title: "Success",
            description: `You are now following ${userProfile.name}`,
            status: "success",
            duration: 5000,
            isClosable: true,
          });
        } else if (data.hasRequest) {
          // Follow request sent (private profile)
          setHasFollowRequest(true);
          toast({
            title: "Follow Request Sent",
            description: `Follow request sent to ${userProfile.name}`,
            status: "info",
            duration: 5000,
            isClosable: true,
          });
        }
      }
    } catch (error) {
      console.error(
        `Error ${
          isFollowing
            ? "unfollowing"
            : hasFollowRequest
            ? "cancelling follow request"
            : "following"
        } user:`,
        error
      );
      toast({
        title: "Error",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsFollowingLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePostUpdate = (postId, updatedPost) => {
    setEntries((prevEntries) =>
      prevEntries.map((entry) =>
        entry._id === postId ? { ...entry, ...updatedPost } : entry
      )
    );
  };

  const renderProfile = () => (
    <Center py={6}>
      <Box
        maxW={"580px"}
        w={"full"}
        bg={colors.bgCard}
        boxShadow={"2xl"}
        rounded={"md"}
        overflow={"hidden"}
      >
        <Image
          h={"120px"}
          w={"full"}
          src={userProfile.backgroundPicture}
          objectFit={"cover"}
        />
        <Flex justify={"center"} mt={-12}>
          <Avatar
            size={"xl"}
            src={userProfile.profileImage}
            css={{ border: "2px solid white" }}
          />
        </Flex>
        <Box p={6}>
          <Stack spacing={0} align={"center"} mb={3}>
            <Heading fontSize={"2xl"} fontWeight={500}>
              {userProfile.name}
            </Heading>
          </Stack>
          <Stack spacing={0} align={"center"} mb={3}>
            <Text color={colors.textMuted}>@{userProfile.username}</Text>
          </Stack>
          <Stack spacing={0} align={"center"} mb={4}>
            <Text color={colors.textMuted}>
              {userProfile.goal} | {userProfile.gymName}
            </Text>
          </Stack>
          <Stack spacing={0} align={"center"} mt={4}>
            <Text color={colors.textMuted} textAlign="center">
              {userProfile.bio}
            </Text>
          </Stack>
          <Stack direction={"row"} justify={"center"} spacing={6} mt={8}>
            <Stack spacing={0} align={"center"}>
              <Text fontWeight={600}>{userProfile.followersCount}</Text>
              <Text fontSize={"sm"} color={colors.textMuted}>
                Followers
              </Text>
            </Stack>
            <Stack spacing={0} align={"center"}>
              <Text fontWeight={600}>{userProfile.followingCount}</Text>
              <Text fontSize={"sm"} color={colors.textMuted}>
                Following
              </Text>
            </Stack>
            <Stack spacing={0} align={"center"}>
              <Text fontWeight={600}>{userProfile.postsCount || 0}</Text>
              <Text fontSize={"sm"} color={colors.textMuted}>
                Posts
              </Text>
            </Stack>
          </Stack>
          <Stack direction={"row"} spacing={4} mt={6}>
            {auth.currentUser?.uid === userId ? (
              <Button
                onClick={() => navigate("/edit-profile")}
                colorScheme="blue"
                variant="outline"
                w={"full"}
              >
                Edit Profile
              </Button>
            ) : (
              <Button
                onClick={handleFollow}
                colorScheme={isFollowing ? "whiteAlpha" : "blue"}
                w={"full"}
                isLoading={isFollowingLoading}
                isDisabled={isFollowingLoadingInitial}
                loadingText={
                  isFollowing
                    ? "Unfollowing..."
                    : hasFollowRequest
                    ? "Canceling Request..."
                    : "Following..."
                }
              >
                {isFollowingLoadingInitial
                  ? "Loading..."
                  : isFollowing
                  ? "Following"
                  : hasFollowRequest
                  ? "Cancel Request"
                  : "Follow"}
              </Button>
            )}
          </Stack>
        </Box>
      </Box>
    </Center>
  );

  const renderPosts = () => (
    <Container maxW="container.xl" py={8}>
      {isLoading ? (
        <Center>
          <Spinner size="lg" />
        </Center>
      ) : entries.length === 0 ? (
        <Center>
          <Text fontSize="lg" color={colors.textMuted}>
            {userProfile.isPrivate &&
            !isFollowing &&
            auth.currentUser?.uid !== userId
              ? "This profile is private. Follow to see their posts."
              : "No posts yet"}
          </Text>
        </Center>
      ) : (
        <>
          <SimpleGrid
            columns={{ base: 1, md: 2, lg: 3 }}
            spacing={6}
            alignItems="center"
            justifyItems="center"
          >
            {entries.map((entry) => (
              <ProductCard
                key={entry._id}
                entry={entry}
                onUpdate={handlePostUpdate}
              />
            ))}
          </SimpleGrid>
          <PaginationComponent
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
            maxVisiblePages={5}
          />
        </>
      )}
    </Container>
  );

  return (
    <Container maxW="container.xl" py={12}>
      {renderProfile()}
      {userProfile.isPrivate &&
      !isFollowing &&
      !hasFollowRequest &&
      auth.currentUser?.uid !== userId ? (
        <Center py={6}>
          <Box
            maxW={"580px"}
            w={"full"}
            bg={colors.bgCard}
            boxShadow={"2xl"}
            rounded={"md"}
            p={6}
            textAlign="center"
          >
            <Text fontSize={"lg"} color={colors.textMuted} mb={4}>
              This profile is private. Send a follow request to view their
              workout posts.
            </Text>
            {auth.currentUser && (
              <Button
                onClick={handleFollow}
                colorScheme="blue"
                isLoading={isFollowingLoading}
                isDisabled={isFollowingLoadingInitial}
                loadingText="Sending Request..."
              >
                {isFollowingLoadingInitial
                  ? "Loading..."
                  : "Send Follow Request"}
              </Button>
            )}
          </Box>
        </Center>
      ) : hasFollowRequest && !isFollowing ? (
        <Center py={6}>
          <Box
            maxW={"580px"}
            w={"full"}
            bg={colors.bgCard}
            boxShadow={"2xl"}
            rounded={"md"}
            p={6}
            textAlign="center"
          >
            <Text fontSize={"lg"} color={colors.textMuted} mb={4}>
              Follow request sent! You'll be able to see their posts once they
              accept your request.
            </Text>
            <Button
              onClick={handleFollow}
              colorScheme="whiteAlpha"
              variant="outline"
              isLoading={isFollowingLoading}
              loadingText="Canceling Request..."
            >
              Cancel Request
            </Button>
          </Box>
        </Center>
      ) : (
        renderPosts()
      )}
    </Container>
  );
};

export default UserProfilePage;
