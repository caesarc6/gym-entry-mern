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
  Box,
} from "@chakra-ui/react";
import { ButtonLoadingSpinner, LoadingIndicator } from "../components/loading";
import { Image } from "@chakra-ui/react";
import { lazy, Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase/supabase";
import { useThemeColors } from "../hooks/useThemeColors";
import { useCustomToast } from "../hooks/useCustomToast";
import { API_ENDPOINTS, apiClient } from "../config/api";
import { getCurrentAuthUser } from "../utils/auth";
import { useProductStore } from "../store/product";
import { useMirrorPostList } from "../hooks/useMirrorPostList";
import { isCapacitorNative as getIsCapacitorNative } from "../utils/isNativePlatform";
import { feedPageLimit } from "../utils/feedPageLimit";

const isCapacitorNative = getIsCapacitorNative();
const PROFILE_POSTS_PAGE_SIZE = feedPageLimit();

const WorkoutCard = lazy(() => import("../components/WorkoutCard"));

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
  const [viewerHasBlocked, setViewerHasBlocked] = useState(false);
  const [blockedViewer, setBlockedViewer] = useState(false);
  const [isBlockLoading, setIsBlockLoading] = useState(false);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  const [isFollowingLoadingInitial, setIsFollowingLoadingInitial] =
    useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [limit] = useState(PROFILE_POSTS_PAGE_SIZE);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalPosts: 0,
    limit: PROFILE_POSTS_PAGE_SIZE,
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(1);
  const appendLockRef = useRef(false);
  const sentinelRef = useRef(null);
  const paginationRef = useRef(pagination);
  paginationRef.current = pagination;
  const { dropIfPresent, entriesRef } = useMirrorPostList({
    entries,
    setEntries,
    ownerUid: paramUserId,
    countUnloadedOwner: true,
    onRemove: () => {
      setUserProfile((prev) => ({
        ...prev,
        postsCount: Math.max(0, (prev.postsCount || 0) - 1),
      }));
      setPagination((prev) => {
        const totalPosts = Math.max(0, (prev.totalPosts || 0) - 1);
        const pageSize = prev.limit || PROFILE_POSTS_PAGE_SIZE;
        return {
          ...prev,
          totalPosts,
          totalPages: Math.max(1, Math.ceil(totalPosts / pageSize)),
        };
      });
    },
  });

  const profileFetchSeq = useRef(0);
  /** Avoid unstable deps (toast / currentUser identity) recreating fetch every render → effect loop. */
  const currentUserRef = useRef(currentUser);
  const toastRef = useRef(null);

  const toast = useCustomToast();
  const colors = useThemeColors();
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
      pageRef.current = 1;
      setHasMore(false);
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
      const nextViewerHasBlocked = profilePayload.viewerHasBlocked === true;
      const nextBlockedViewer = profilePayload.blockedViewer === true;
      setViewerHasBlocked(nextViewerHasBlocked);
      setBlockedViewer(nextBlockedViewer);

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
        !nextViewerHasBlocked &&
        !nextBlockedViewer &&
        (!userData.isPrivate || followingForPosts || viewerIsOwner);

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
          API_ENDPOINTS.POSTS(userId, 1, limit)
        );
        if (seq !== profileFetchSeq.current) return;
        const postsData = postsResponse.data;

        if (postsData.success) {
          // Normalize posts to match WorkoutCard expectations
          const normalizedEntries = postsData.data.map((post) => ({
            _id: post._id,
            name: post.name || "Untitled",
            description: post.description || "No description",
            image: post.image || null,
            likes: Array.isArray(post.likes) ? post.likes : [],
            ...(Array.isArray(post.comments) ? { comments: post.comments } : {}),
            commentsCount:
              post.commentsCount ??
              (Array.isArray(post.comments) ? post.comments.length : 0),
            createdAt: post.createdAt || new Date().toISOString(),
            uid: post.uid || userId, // WorkoutCard expects 'uid' field
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
          pageRef.current = 1;
          setHasMore((postsData.pagination?.totalPages ?? 1) > 1);
        }
      } else {
        // For private profiles that we can't see posts for, set empty entries
        setEntries([]);
        setHasMore(false);
        setPagination({
          currentPage: 1,
          totalPages: 0,
          totalPosts: 0,
          limit: PROFILE_POSTS_PAGE_SIZE,
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
  }, [userId, limit]);

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
        }
      } else if (hasFollowRequest) {
        // Cancel follow request
        const response = await apiClient.delete(
          API_ENDPOINTS.FOLLOW_REQUEST(userId)
        );
        const data = response.data;

        if (data.success) {
          setHasFollowRequest(false);
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
        } else if (data.hasRequest) {
          // Follow request sent (private profile)
          setHasFollowRequest(true);
        }
      }
    } catch (error) {
      toast.error("Error", error.message);
    } finally {
      setIsFollowingLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!userId || currentUser?.uid === userId) return;
    setIsBlockLoading(true);
    try {
      if (viewerHasBlocked) {
        await apiClient.delete(API_ENDPOINTS.BLOCK_USER(userId));
        setViewerHasBlocked(false);
        toast.success("Unblocked", "You can see this profile again.");
        fetchUserProfile();
      } else {
        await apiClient.post(API_ENDPOINTS.BLOCK_USER(userId));
        setViewerHasBlocked(true);
        setIsFollowing(false);
        setHasFollowRequest(false);
        setEntries([]);
        setUserProfile((prev) => ({ ...prev, allowsPostView: false }));
        toast.success("Blocked", "You won't see this member's workouts.");
      }
    } catch (error) {
      toast.error(
        "Error",
        error?.response?.data?.message || error.message || "Couldn't update block.",
      );
    } finally {
      setIsBlockLoading(false);
    }
  };

  const loadMorePosts = useCallback(async () => {
    if (!userId || appendLockRef.current || isLoading) return;
    const totalPages = paginationRef.current.totalPages || 1;
    if (pageRef.current >= totalPages) return;

    const page = pageRef.current + 1;
    appendLockRef.current = true;
    setIsLoadingMore(true);
    try {
      const response = await apiClient.get(
        API_ENDPOINTS.POSTS(userId, page, limit)
      );
      const data = response.data;
      if (!data.success || !Array.isArray(data.data)) {
        throw new Error(data.message || "Failed to load workouts");
      }

      const normalizedEntries = data.data.map((post) => ({
        _id: post._id,
        name: post.name || "Untitled",
        description: post.description || "No description",
        image: post.image || null,
        likes: Array.isArray(post.likes) ? post.likes : [],
        ...(Array.isArray(post.comments) ? { comments: post.comments } : {}),
        commentsCount:
          post.commentsCount ??
          (Array.isArray(post.comments) ? post.comments.length : 0),
        createdAt: post.createdAt || new Date().toISOString(),
        uid: post.uid || userId,
        ownerId: post.uid || userId,
        trainerUid: post.trainerUid || null,
        trainerName: post.trainerName || null,
        trainerUsername: post.trainerUsername || null,
        authorProfile: post.authorProfile || null,
        trainerProfile: post.trainerProfile || null,
      }));
      const prev = entriesRef.current || [];
      const seen = new Set(prev.map((entry) => String(entry._id)));
      const extra = normalizedEntries.filter(
        (post) => !seen.has(String(post._id))
      );
      const next = extra.length ? [...prev, ...extra] : prev;
      entriesRef.current = next;
      setEntries(next);
      pageRef.current = page;

      const reportedPages = data.pagination?.totalPages ?? totalPages;
      const reachedEnd =
        normalizedEntries.length < limit || page >= reportedPages;
      setHasMore(!reachedEnd);
      setPagination((prev) => ({
        ...prev,
        ...(data.pagination || {}),
        currentPage: page,
        totalPages: reachedEnd ? page : reportedPages,
      }));
    } catch (error) {
      toast.error("Error", error.message || "Failed to load more workouts");
    } finally {
      appendLockRef.current = false;
      setIsLoadingMore(false);
    }
  }, [userId, limit, isLoading, toast, entriesRef]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return undefined;
    const observer = new IntersectionObserver(
      (observed) => {
        if (observed.some((entry) => entry.isIntersecting)) {
          void loadMorePosts();
        }
      },
      { rootMargin: "280px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMorePosts, entries.length]);

  const handlePostUpdate = (postId, updatedPost) => {
    setEntries((prevEntries) =>
      prevEntries.map((entry) =>
        entry._id === postId ? { ...entry, ...updatedPost } : entry
      )
    );
  };

  const handlePostDelete = useCallback(
    (pid) => {
      dropIfPresent(pid);
    },
    [dropIfPresent]
  );

  const renderProfile = () => (
    <Box maxW="800px" mx="auto" w="full">
      <Box borderRadius="2xl" overflow="hidden" bg={colors.bgMuted}>
        {userProfile.backgroundPicture ? (
          <Image
            h={{ base: "140px", md: "168px" }}
            w="full"
            src={userProfile.backgroundPicture}
            objectFit="cover"
            alt="Background"
            fallback={
              <Box h={{ base: "140px", md: "168px" }} w="full" bg={colors.bgMuted} />
            }
          />
        ) : (
          <Box h={{ base: "140px", md: "168px" }} w="full" bg={colors.bgMuted} />
        )}
      </Box>
      <Flex justify="center" mt={-12}>
        <Avatar
          size="xl"
          name={userProfile.name || userProfile.username}
          src={userProfile.profileImage || undefined}
          bg={colors.bgMuted}
          color={colors.textPrimary}
          css={{
            border: "4px solid hsl(var(--background))",
          }}
        />
      </Flex>
      <Box textAlign="center" pt={5}>
        <Heading
          size={{ base: "lg", md: "xl" }}
          color={colors.textPrimary}
          fontWeight="500"
        >
          {userProfile.name}
        </Heading>
        {userProfile.username ? (
          <Text mt={2} fontSize="sm" color={colors.textMuted}>
            @{userProfile.username}
          </Text>
        ) : null}
        <Text
          maxW="460px"
          mx="auto"
          mt={4}
          fontSize="sm"
          color={colors.textMuted}
          lineHeight="1.8"
        >
          {[userProfile.goal, userProfile.gymName].filter(Boolean).join(" · ")}
        </Text>
        {userProfile.bio ? (
          <Text
            maxW="460px"
            mx="auto"
            mt={2}
            fontSize="sm"
            color={colors.textMuted}
            lineHeight="1.8"
          >
            {userProfile.bio}
          </Text>
        ) : null}
        <Flex justify="center" gap={{ base: 8, md: 12 }} mt={8}>
          <Box textAlign="center">
            <Text fontWeight="500" color={colors.textPrimary}>
              {userProfile.followersCount}
            </Text>
            <Text fontSize="sm" color={colors.textMuted} mt={1}>
              Followers
            </Text>
          </Box>
          <Box textAlign="center">
            <Text fontWeight="500" color={colors.textPrimary}>
              {userProfile.followingCount}
            </Text>
            <Text fontSize="sm" color={colors.textMuted} mt={1}>
              Following
            </Text>
          </Box>
          <Box textAlign="center">
            <Text fontWeight="500" color={colors.textPrimary}>
              {userProfile.postsCount || 0}
            </Text>
            <Text fontSize="sm" color={colors.textMuted} mt={1}>
              Workouts
            </Text>
          </Box>
        </Flex>
        <Button
          mt={8}
          onClick={
            currentUser?.uid === userId
              ? () => navigate("/settings")
              : handleFollow
          }
          display={
            currentUser?.uid !== userId && (viewerHasBlocked || blockedViewer)
              ? "none"
              : undefined
          }
          variant="outline"
          color={colors.textPrimary}
          borderColor={colors.borderColor}
          borderRadius="full"
          fontWeight="500"
          minW="180px"
          isLoading={currentUser?.uid === userId ? false : isFollowingLoading}
          isDisabled={
            currentUser?.uid === userId ? false : isFollowingLoadingInitial
          }
          spinner={<ButtonLoadingSpinner />}
          _hover={{ bg: colors.bgHover, borderColor: colors.borderColorInput }}
        >
          {currentUser?.uid === userId
            ? "Edit profile"
            : isFollowingLoadingInitial
              ? "Loading..."
              : isFollowing
                ? "Following"
                : hasFollowRequest
                  ? "Cancel request"
                  : "Follow"}
        </Button>
        {currentUser?.uid !== userId && !blockedViewer ? (
          <Button
            mt={viewerHasBlocked ? 8 : 3}
            onClick={handleBlock}
            variant="ghost"
            color={colors.textMuted}
            borderRadius="full"
            fontWeight="500"
            minW="180px"
            isLoading={isBlockLoading}
            spinner={<ButtonLoadingSpinner />}
          >
            {viewerHasBlocked ? "Unblock" : "Block"}
          </Button>
        ) : null}
      </Box>
    </Box>
  );

  const renderPosts = () => (
    <Container maxW="container.xl" py={8}>
      {isLoading ? (
        <Center>
          <LoadingIndicator variant="hero" />
        </Center>
      ) : entries.length === 0 ? (
        <Center>
          <Text fontSize="lg" color={colors.textMuted}>
            {userProfile.isPrivate &&
            !userProfile.allowsPostView &&
            currentUser?.uid !== userId
              ? "This profile is private. Follow to see their workouts."
              : "No workouts yet"}
          </Text>
        </Center>
      ) : (
        <>
          <Suspense
            fallback={
              <Center py={8}>
                <LoadingIndicator variant="hero" />
              </Center>
            }
          >
            <SimpleGrid
              columns={{ base: 1, md: 2, lg: 3 }}
              spacing={6}
              w="full"
              alignItems="stretch"
              justifyItems="stretch"
            >
              {entries.map((entry, index) => (
                <WorkoutCard
                  key={entry._id}
                  entry={entry}
                  priority={index < 3}
                  onUpdate={handlePostUpdate}
                  onDelete={handlePostDelete}
                />
              ))}
            </SimpleGrid>
          </Suspense>
          {hasMore ? (
            <Box ref={sentinelRef} w="full" py={4} aria-hidden>
              {isLoadingMore ? <LoadingIndicator variant="hero" /> : null}
            </Box>
          ) : null}
        </>
      )}
    </Container>
  );

  return (
    <Container
      maxW="container.xl"
      pt={isCapacitorNative ? 4 : 12}
      pb={12}
    >
      {renderProfile()}
      {currentUser?.uid !== userId && (viewerHasBlocked || blockedViewer) ? (
        <Center py={6}>
          <Box
            maxW="580px"
            w="full"
            bg={colors.bgCard}
            boxShadow="sm"
            rounded="2xl"
            p={6}
            textAlign="center"
          >
            <Text fontSize="lg" color={colors.textMuted}>
              {viewerHasBlocked
                ? "You blocked this member. Their workouts stay hidden until you unblock them."
                : "This member isn't available."}
            </Text>
          </Box>
        </Center>
      ) : userProfile.isPrivate &&
      !userProfile.allowsPostView &&
      !hasFollowRequest &&
      currentUser?.uid !== userId ? (
        <Center py={6}>
          <Box
            maxW={"580px"}
            w={"full"}
            bg={colors.bgCard}
            boxShadow="sm"
            rounded="2xl"
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
                spinner={<ButtonLoadingSpinner />}
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
            boxShadow="sm"
            rounded="2xl"
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
              spinner={<ButtonLoadingSpinner />}
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
