import {
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
import { lazy, Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase/supabase";
import { SlArrowRight, SlArrowLeft } from "react-icons/sl";
import { useThemeColors } from "../hooks/useThemeColors";
import { useCustomToast } from "../hooks/useCustomToast";

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
import { getCurrentAuthUser } from "../utils/auth";
import { useProductStore } from "../store/product";

const ProductCard = lazy(() => import("../components/ProductCard"));

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
    /** Same logic as post fetch permission; do not use isFollowing for layout (it can flicker). */
    allowsPostView: false,
  });
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [hasFollowRequest, setHasFollowRequest] = useState(false);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  const [isFollowingLoadingInitial, setIsFollowingLoadingInitial] =
    useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(6);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalPosts: 0,
    limit: 6,
  });

  const profileFetchSeq = useRef(0);
  /** Avoid unstable deps (toast / currentUser identity) recreating fetch every render → effect loop. */
  const currentUserRef = useRef(currentUser);
  const toastRef = useRef(null);

  const toast = useCustomToast();
  const colors = useThemeColors();
  const profileColorMode =
    colors.currentTheme === "light" ? lightUrl : nightUrl;
  const bgColorMode =
    colors.currentTheme === "light" ? defaultBgUrl : defaultBgNightUrl;

  currentUserRef.current = currentUser;
  toastRef.current = toast;

  // Determine userId: use paramUserId if available, otherwise use current user's UID
  const userId = paramUserId || currentUser?.uid;

  useEffect(() => {
    const syncAuthUser = async () => {
      const user = await getCurrentAuthUser();
      setCurrentUser(user);
      useProductStore.getState().setCurrentUser(user);
      setIsAuthLoading(false);
    };

    syncAuthUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setCurrentUser({
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
          });
          useProductStore.getState().setCurrentUser({
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
          });
        } else {
          syncAuthUser();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Check follow status and request status
  const checkFollowStatus = useCallback(async () => {
    try {
      const user = currentUser;
      if (!user || user.uid === userId) return;

      const response = await apiClient.get(
        API_ENDPOINTS.FOLLOW_REQUEST_STATUS(userId)
      );
      const followStatusData = response.data;
      setIsFollowing(followStatusData.isFollowing || false);
      setHasFollowRequest(followStatusData.hasRequest || false);
    } catch (error) {}
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
    const seq = ++profileFetchSeq.current;
    const user = currentUserRef.current;
    const toastNotify = toastRef.current;
    try {
      setIsLoading(true);
      if (!user) {
        throw new Error("User not authenticated");
      }
      if (!userId) {
        return;
      }

      // Fetch user profile data
      const profileResponse = await apiClient.get(
        API_ENDPOINTS.GET_USER_PROFILE(userId)
      );
      if (seq !== profileFetchSeq.current) return;

      const profilePayload = profileResponse.data;
      const viewerIsOwner = profilePayload.viewerIsOwner === true;

      const userData = profilePayload.data.user;

      const finalProfileImage = userData.picture || userData.profileImage || "";

      // Use API response for follow state — React `isFollowing` is stale in this same tick
      let followingForPosts = false;
      if (user && user.uid !== userId) {
        const followStatusResponse = await apiClient.get(
          API_ENDPOINTS.FOLLOW_REQUEST_STATUS(userId)
        );
        if (seq !== profileFetchSeq.current) return;
        const followStatusData = followStatusResponse.data;
        followingForPosts = followStatusData.isFollowing || false;
        setIsFollowing(followingForPosts);
        setHasFollowRequest(followStatusData.hasRequest || false);
        setIsFollowingLoadingInitial(false);
      } else {
        setIsFollowing(false);
        setHasFollowRequest(false);
        setIsFollowingLoadingInitial(false);
      }

      // Owner must match linked Firebase/Supabase ids (viewerIsOwner from API), not raw URL vs JWT string
      const allowsPostView =
        !userData.isPrivate || followingForPosts || viewerIsOwner;

      setUserProfile({
        name: userData.name || "Name",
        username: userData.username || userData.name || "Username",
        goal: userData.goal || "Not set",
        gymName: userData.gymName || "Not specified",
        postsCount: profilePayload.data.postsCount || 0,
        bio: userData.bio || "No bio available",
        profileImage: finalProfileImage,
        backgroundPicture: userData.backgroundPicture || "",
        followersCount: profilePayload.data.followersCount || 0,
        followingCount: profilePayload.data.followingCount || 0,
        isPrivate: userData.isPrivate || false,
        allowsPostView,
      });

      const shouldFetchPosts = allowsPostView;

      if (shouldFetchPosts) {
        const postsResponse = await apiClient.get(
          API_ENDPOINTS.POSTS(userId, currentPage, limit)
        );
        if (seq !== profileFetchSeq.current) return;
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
            trainerUid: post.trainerUid || null,
            trainerName: post.trainerName || null,
            trainerUsername: post.trainerUsername || null,
            authorProfile: post.authorProfile || {
              uid: post.uid || userId,
              profileImage: finalProfileImage,
              displayName: userData.username || userData.name || "Unknown User",
              isUsername: Boolean(userData.username),
            },
            trainerProfile: post.trainerProfile || null,
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
      toastNotify?.error(
        "Error",
        error.message || "Failed to load profile"
      );
    } finally {
      if (seq === profileFetchSeq.current) {
        setIsLoading(false);
      }
    }
  }, [userId, currentPage, limit]);

  useEffect(() => {
    if (!currentUser?.uid) {
      setIsAuthLoading(false);
      setIsLoading(false);
      return;
    }
    setIsAuthLoading(false);
    fetchUserProfile();
  }, [currentUser?.uid, fetchUserProfile]);

  const handleFollow = async () => {
    try {
      setIsFollowingLoading(true);
      const user = currentUser;
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
            allowsPostView: !prev.isPrivate,
          }));
          toast.success("Success", `You have unfollowed ${userProfile.name}`);
        }
      } else if (hasFollowRequest) {
        // Cancel follow request
        const response = await apiClient.delete(
          API_ENDPOINTS.FOLLOW_REQUEST(userId)
        );
        const data = response.data;

        if (data.success) {
          setHasFollowRequest(false);
          toast.info(
            "Follow Request Cancelled",
            `Follow request to ${userProfile.name} has been cancelled`
          );
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
            allowsPostView: true,
          }));
          toast.success("Success", `You are now following ${userProfile.name}`);
        } else if (data.hasRequest) {
          // Follow request sent (private profile)
          setHasFollowRequest(true);
          toast.info(
            "Follow Request Sent",
            `Follow request sent to ${userProfile.name}`
          );
        }
      }
    } catch (error) {
      toast.error("Error", error.message);
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

  const handlePostDelete = useCallback((pid) => {
    const idStr = String(pid);
    setEntries((prev) => prev.filter((e) => String(e._id) !== idStr));
    setUserProfile((prev) => ({
      ...prev,
      postsCount: Math.max(0, prev.postsCount - 1),
    }));
    setPagination((prev) => {
      const totalPosts = Math.max(0, prev.totalPosts - 1);
      const totalPages = Math.max(1, Math.ceil(totalPosts / prev.limit));
      return { ...prev, totalPosts, totalPages };
    });
  }, []);

  useEffect(() => {
    if (currentPage > pagination.totalPages && pagination.totalPages >= 1) {
      setCurrentPage(pagination.totalPages);
    }
  }, [currentPage, pagination.totalPages]);

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
          src={userProfile.backgroundPicture || bgColorMode}
          objectFit={"cover"}
        />
        <Flex justify={"center"} mt={-12}>
          <Avatar
            size={"xl"}
            src={userProfile.profileImage || profileColorMode}
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
            {currentUser?.uid === userId ? (
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
            !userProfile.allowsPostView &&
            currentUser?.uid !== userId
              ? "This profile is private. Follow to see their posts."
              : "No posts yet"}
          </Text>
        </Center>
      ) : (
        <>
          <Suspense
            fallback={
              <Center py={8}>
                <Spinner size="lg" />
              </Center>
            }
          >
            <SimpleGrid
              columns={{ base: 1, md: 2, lg: 3 }}
              spacing={6}
              alignItems="center"
              justifyItems="center"
            >
              {entries.map((entry, index) => (
                <ProductCard
                  key={entry._id}
                  entry={entry}
                  priority={index < 3}
                  onUpdate={handlePostUpdate}
                  onDelete={handlePostDelete}
                />
              ))}
            </SimpleGrid>
          </Suspense>
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
      !userProfile.allowsPostView &&
      !hasFollowRequest &&
      currentUser?.uid !== userId ? (
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
            {currentUser && (
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
