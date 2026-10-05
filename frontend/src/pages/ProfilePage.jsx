import {
  Container,
  SimpleGrid,
  Text,
  VStack,
  Button,
  Box,
  Heading,
  Avatar,
  Center,
  Flex,
  Image,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Input,
  Textarea,
  HStack,
} from "@chakra-ui/react";
import { LoadingIndicator } from "../components/loading";
import { lazy, Suspense, useEffect, useState, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useProductStore } from "../store/product";
import { FileUploader } from "../components/FileUploader";
import { PROFILE_IMAGE_ASPECT } from "../constants/imageAspectRatios";
import { supabase } from "../supabase/supabase";
import { useThemeColors } from "../hooks/useThemeColors";
import { useCustomToast } from "../hooks/useCustomToast";
import { getCurrentAuthUser } from "../utils/auth";
import { API_ENDPOINTS, apiClient } from "../config/api";
import PrivacySettings from "../components/PrivacySettings";
import { useProductStore as useUiStore } from "../store/product";
import SignedOutTabPrompt from "../components/SignedOutTabPrompt";
import { isCapacitorNative as getIsCapacitorNative } from "../utils/isNativePlatform";
import { feedPageLimit } from "../utils/feedPageLimit";
import { useMirrorPostList } from "../hooks/useMirrorPostList";

const isCapacitorNative = getIsCapacitorNative();
const PROFILE_POSTS_PAGE_SIZE = feedPageLimit();
const ProductCard = lazy(() => import("../components/ProductCard"));

const ProfilePage = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uid, setUid] = useState(null);
  const [entries, setEntries] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
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
  });
  const { dropIfPresent, entriesRef } = useMirrorPostList({
    entries,
    setEntries,
    ownerUid: uid,
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
  const [profileImage, setProfileImage] = useState(null);
  const [isFollowersOpen, setIsFollowersOpen] = useState(false);
  const [isFollowingOpen, setIsFollowingOpen] = useState(false);
  const location = useLocation();
  const followersDialogRef = useRef(null);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [followRequests, setFollowRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const closeFollowers = useCallback(() => {
    setIsFollowersOpen(false);
  }, []);

  useEffect(() => {
    if (location.pathname === "/profile") return;
    setIsFollowersOpen(false);
    setFollowersList([]);
    setFollowingList([]);
    if (pageRef.current <= 1) return;

    pageRef.current = 1;
    setCurrentPage(1);
    setEntries((prev) => prev.slice(0, limit));
    setHasMore((paginationRef.current?.totalPages ?? 1) > 1);
    if (!uid) return;
    const cache = useProductStore.getState().profileTabCache;
    if (cache?.uid !== uid || !Array.isArray(cache.entries)) return;
    useProductStore.getState().setProfileTabCache({
      ...cache,
      entries: cache.entries.slice(0, limit),
      currentPage: 1,
    });
  }, [location.pathname, uid, limit]);

  useEffect(() => {
    if (!isFollowersOpen) return undefined;
    const onPointerDown = (event) => {
      const dialog = followersDialogRef.current;
      const target = event.target;
      if (
        dialog instanceof Element &&
        target instanceof Node &&
        dialog.contains(target)
      ) {
        return;
      }
      setIsFollowersOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [isFollowersOpen]);

  const toast = useCustomToast();
  const colors = useThemeColors();
  const {
    setProfileTabCache,
    clearProfileTabCache,
    feedCacheTtlMs,
    currentUserInfo,
  } = useUiStore();
  const {


    isOpen: isProfileOpen,
    onOpen: onProfileOpen,
    onClose: onProfileClose,
  } = useDisclosure();
  const {
    isOpen: isPrivacyOpen,
    onOpen: onPrivacyOpen,
    onClose: onPrivacyClose,
  } = useDisclosure();

  const setMergedProfileCache = (patch) => {
    const prev = useProductStore.getState().profileTabCache;
    const base = prev && prev.uid === patch.uid ? prev : {};
    setProfileTabCache({ ...base, ...patch, cachedAt: Date.now() });
  };

  const hasUsablePostsCache = (cache, page) => {
    if (!cache || cache.postsLoaded !== true) return false;
    if (cache.currentPage !== page) return false;
    const totalPosts = cache.pagination?.totalPosts;
    const hasEntries = Array.isArray(cache.entries) && cache.entries.length > 0;
    // If we know totalPosts is 0, an empty list is valid.
    const knownEmpty = typeof totalPosts === "number" && totalPosts === 0;
    return hasEntries || knownEmpty;
  };

  const hasUsableProfileCache = (cache) => {
    if (!cache || cache.profileLoaded !== true) return false;
    const p = cache.userProfile;
    if (!p || typeof p !== "object") return false;
    // Treat missing core identity fields as unusable (prevents "blank header" lock-in).
    const hasName = typeof p.name === "string" && p.name.trim().length > 0;
    const hasUsername =
      typeof p.username === "string" && p.username.trim().length > 0;
    return hasName || hasUsername;
  };

  // Handle auth state
  useEffect(() => {
    const syncAuth = async () => {
      setIsLoading(true);
      const user = await getCurrentAuthUser();
      if (user) {
        // Restore cached profile instantly when returning to the tab.
        const cachedTab = useProductStore.getState().profileTabCache;
        if (
          cachedTab &&
          cachedTab.uid === user.uid &&
          (cachedTab.profileLoaded || cachedTab.postsLoaded) &&
          Date.now() - cachedTab.cachedAt < feedCacheTtlMs
        ) {
          setIsSignedIn(true);
          setUid(user.uid);
          useProductStore.getState().setCurrentUser(user);
          setCurrentPage(1);
          pageRef.current = 1;
          setEntries(
            cachedTab.currentPage === 1 ? cachedTab.entries || [] : []
          );
          setPagination(
            cachedTab.pagination || {
              currentPage: 1,
              totalPages: 1,
              totalPosts: (cachedTab.entries || []).length,
              limit,
            }
          );
          setHasMore(
            cachedTab.currentPage === 1 &&
              (cachedTab.pagination?.totalPages ?? 1) > 1
          );
          if (cachedTab.userProfile) {
            setUserProfile(cachedTab.userProfile);
          }
          setFollowRequests(cachedTab.followRequests || []);
          setIsAdmin(Boolean(cachedTab.isAdmin));
          setIsLoading(false);

          // If posts cache is partial/empty, force-load posts for the current page.
          if (!hasUsablePostsCache(cachedTab, 1)) {
            fetchUserPosts(user.uid, 1);
          }
          // If we only cached posts but never cached profile, fetch profile now.
          if (!hasUsableProfileCache(cachedTab)) {
            fetchUserProfile(user);
          }
          return;
        }

        setIsSignedIn(true);
        setUid(user.uid);
        useProductStore.getState().setCurrentUser(user);
        // Keep the loading spinner until the first profile + posts load settles.
        await Promise.allSettled([
          fetchUserProfile(user),
          fetchUserPosts(user.uid, 1),
        ]);
      } else {
        setIsSignedIn(false);
        setUid(null);
        setEntries([]);
        clearProfileTabCache();
        setUserProfile({
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
        });
      }
      setIsLoading(false);
    };

    syncAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          const user = {
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
          setUid(user.uid);
          useProductStore.getState().setCurrentUser(user);
          // Avoid refetch if cache is warm.
          const cachedTab = useProductStore.getState().profileTabCache;
          if (
            cachedTab &&
            cachedTab.uid === user.uid &&
            (cachedTab.profileLoaded || cachedTab.postsLoaded) &&
            Date.now() - cachedTab.cachedAt < feedCacheTtlMs
          ) {
            setCurrentPage(1);
            pageRef.current = 1;
            setEntries(
              cachedTab.currentPage === 1 ? cachedTab.entries || [] : []
            );
            setPagination(
              cachedTab.pagination || {
                currentPage: 1,
                totalPages: 1,
                totalPosts: (cachedTab.entries || []).length,
                limit,
              }
            );
            setHasMore(
              cachedTab.currentPage === 1 &&
                (cachedTab.pagination?.totalPages ?? 1) > 1
            );
            if (cachedTab.userProfile) {
              setUserProfile(cachedTab.userProfile);
            }
            setFollowRequests(cachedTab.followRequests || []);
            if (!hasUsableProfileCache(cachedTab)) {
              fetchUserProfile(user);
            }
            if (!hasUsablePostsCache(cachedTab, 1)) {
              fetchUserPosts(user.uid, 1);
            }
          } else {
            setIsLoading(true);
            Promise.allSettled([fetchUserProfile(user), fetchUserPosts(user.uid, 1)]).finally(
              () => setIsLoading(false)
            );
          }
        } else {
          syncAuth();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [clearProfileTabCache, feedCacheTtlMs]);

  // Fetch posts when page changes. Do not depend on profileTabCache — every cache merge
  // bumps cachedAt and would retrigger this effect (many duplicate requests on errors).
  useEffect(() => {
    if (!uid) return;
    const cache = useProductStore.getState().profileTabCache;
    if (
      cache?.uid === uid &&
      hasUsablePostsCache(cache, currentPage) &&
      Date.now() - cache.cachedAt < feedCacheTtlMs
    ) {
      return;
    }
    fetchUserPosts(uid, currentPage);
  }, [currentPage, uid]);

  // Admin comes from the account read at sign-in. The admin page still checks the admin route.
  useEffect(() => {
    if (!isSignedIn || !uid) {
      setIsAdmin(false);
      return;
    }
    const info = currentUserInfo;
    const matches =
      info &&
      [info.uid, info.firebaseUid, info.supabaseUid].filter(Boolean).includes(uid);
    if (!matches) return;
    const nextIsAdmin = Boolean(info.isAdmin);
    setIsAdmin(nextIsAdmin);
    setMergedProfileCache({
      uid,
      isAdmin: nextIsAdmin,
      adminLoaded: true,
    });
  }, [isSignedIn, uid, currentUserInfo]);

  // Fetch follow requests
  const fetchFollowRequests = async () => {
    try {
      setIsLoadingRequests(true);
      const user = await getCurrentAuthUser();
      if (!user) throw new Error("User not authenticated");

      const response = await apiClient.get(
        API_ENDPOINTS.FOLLOW_REQUESTS_PENDING
      );

      const data = response.data;
      const next = data.data || [];
      setFollowRequests(next);
      // Patch follow-requests only; avoid stale entries/pagination from closure.
      setMergedProfileCache({
        uid: user.uid,
        followRequests: next,
        followRequestsLoaded: true,
      });
    } catch (error) {
      toast.error(
        "Failed to load requests",
        "Unable to fetch follow requests at this time."
      );
    } finally {
      setIsLoadingRequests(false);
    }
  };

  // Handle follow request actions
  const handleFollowRequestAction = async (requestId, action) => {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.FOLLOW_REQUEST_ACTION(requestId, action)
      );

      const data = response.data;

      // Remove the processed request from the list
      setFollowRequests((prev) =>
        prev.filter((request) => request._id !== requestId)
      );

      // Refresh user profile to update follower count
      if (uid) {
        const currentUser = await getCurrentAuthUser();
        if (currentUser) {
          fetchUserProfile(currentUser);
        }
      }
    } catch (error) {
      toast.error("Error", "Failed to process request");
    }
  };

  // Add useEffect to fetch follow requests when user is authenticated
  useEffect(() => {
    if (uid) {
      const cache = useProductStore.getState().profileTabCache;
      if (
        cache?.uid === uid &&
        cache.followRequestsLoaded === true &&
        Date.now() - cache.cachedAt < feedCacheTtlMs
      ) {
        setFollowRequests(cache.followRequests || []);
        return;
      }
      fetchFollowRequests();
    }
  }, [uid, feedCacheTtlMs]);

  const fetchUserProfile = async (user) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.GET_USER_PROFILE(user.uid));

      const data = response.data;
      const userData = data?.data?.user || {};
      const followersCount =
        data?.data?.followersCount ?? userData.followersCount ?? 0;
      const followingCount =
        data?.data?.followingCount ?? userData.followingCount ?? 0;
      const postsCount = data?.data?.postsCount ?? 0;

      const nextProfile = {
        name: userData.name || "Name",
        username: userData.username || userData.name || "Username",
        goal: userData.goal || "Not set",
        gymName: userData.gymName || "Not specified",
        postsCount,
        bio: userData.bio || "No bio available",
        profileImage: userData.picture || userData.profileImage || "",
        backgroundPicture: userData.backgroundPicture || "",
        followersCount,
        followingCount,
      };
      setUserProfile(nextProfile);

      setMergedProfileCache({
        uid: user.uid,
        userProfile: nextProfile,
        profileLoaded: true,
      });
    } catch (error) {
      // Surface real backend error details (common on iOS when token isn't attached yet).
      console.error("[ProfilePage] fetchUserProfile failed", {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });
      const status = error?.response?.status;
      const serverMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.response?.data?.details ||
        null;
      const msg =
        serverMsg ||
        (error?.code === "ERR_NETWORK"
          ? "Network error reaching API (check VITE_API_BASE_URL / live-reload network)."
          : error?.message) ||
        "Unable to load profile data.";
      toast.error(
        "Profile load failed",
        status ? `${msg} (HTTP ${status})` : msg
      );
    }
  };

  const fetchUserPosts = async (userId, page = 1) => {
    try {
      const response = await apiClient.get(
        API_ENDPOINTS.POSTS(userId, page, limit)
      );

      const data = response.data;

      if (data.success) {
        const normalizedPosts = (data.data || []).map((post) => ({
          ...post,
          trainerUid: post.trainerUid || null,
          trainerName: post.trainerName || null,
          trainerUsername: post.trainerUsername || null,
        }));
        setEntries(normalizedPosts);
        setPagination(data.pagination);
        pageRef.current = page;
        setHasMore((data.pagination?.totalPages ?? 1) > page);

        setMergedProfileCache({
          uid: userId,
          currentPage: page,
          limit,
          entries: normalizedPosts,
          pagination: data.pagination,
          postsLoaded: true,
        });
      } else {
        toast.error("Error", data.message || "Failed to fetch posts");
      }
    } catch (error) {
      console.error("[ProfilePage] fetchUserPosts failed", {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });
      const status = error?.response?.status;
      const serverMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.response?.data?.details ||
        null;
      const msg =
        serverMsg ||
        (error?.code === "ERR_NETWORK"
          ? "Network error reaching API (check VITE_API_BASE_URL / live-reload network)."
          : error?.message) ||
        "Failed to fetch posts";
      toast.error("Posts load failed", status ? `${msg} (HTTP ${status})` : msg);
    }
  };

  const loadMorePosts = useCallback(async () => {
    if (!uid || appendLockRef.current) return;
    const totalPages = paginationRef.current.totalPages || 1;
    if (pageRef.current >= totalPages) return;

    const page = pageRef.current + 1;
    appendLockRef.current = true;
    setIsLoadingMore(true);
    try {
      const response = await apiClient.get(
        API_ENDPOINTS.POSTS(uid, page, limit)
      );
      const data = response.data;
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch posts");
      }

      const normalizedPosts = (data.data || []).map((post) => ({
        ...post,
        trainerUid: post.trainerUid || null,
        trainerName: post.trainerName || null,
        trainerUsername: post.trainerUsername || null,
      }));
      const prev = entriesRef.current || [];
      const seen = new Set(prev.map((entry) => String(entry._id)));
      const extra = normalizedPosts.filter(
        (post) => !seen.has(String(post._id))
      );
      const next = extra.length ? [...prev, ...extra] : prev;
      entriesRef.current = next;
      setEntries(next);
      pageRef.current = page;

      const reportedPages = data.pagination?.totalPages ?? totalPages;
      const reachedEnd =
        normalizedPosts.length < limit || page >= reportedPages;
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
  }, [uid, limit, toast, entriesRef]);

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

  const handlePostUpdate = (pid, updatedEntry) => {
    setEntries((prevEntries) => {
      const next = prevEntries.map((entry) =>
        entry._id === pid ? { ...entry, ...updatedEntry } : entry
      );
      if (uid) {
        const cache = useProductStore.getState().profileTabCache;
        if (cache?.uid === uid && Array.isArray(cache.entries)) {
          setMergedProfileCache({
            uid,
            entries: cache.entries.map((entry) =>
              entry._id === pid ? { ...entry, ...updatedEntry } : entry
            ),
          });
        }
      }
      return next;
    });
  };

  const handlePostDelete = useCallback(
    (pid) => {
      dropIfPresent(pid);
    },
    [dropIfPresent]
  );

  const handleProfileImageUpload = (file) => {
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserProfile((prev) => ({
          ...prev,
          profileImage: reader.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const user = await getCurrentAuthUser();
    if (!user) {
      toast.error("Error", "You must be signed in to update your profile.");
      return;
    }

    // Basic validation
    if (!userProfile.name.trim()) {
      toast.error("Error", "Name is required");
      return;
    }

    if (userProfile.username && userProfile.username.includes(" ")) {
      toast.error("Error", "Username cannot contain spaces");
      return;
    }

    try {
      const profileFormData = new FormData();
      profileFormData.append("name", userProfile.name);
      profileFormData.append("username", userProfile.username);
      profileFormData.append("goal", userProfile.goal);
      profileFormData.append("gymName", userProfile.gymName);
      profileFormData.append("bio", userProfile.bio);
      if (profileImage) {
        profileFormData.append("profileImage", profileImage);
        profileFormData.append("profileImageName", profileImage.name);
      }

      const profileResponse = await apiClient.post(
        API_ENDPOINTS.UPDATE_USER_PROFILE,
        profileFormData
      );

      const profileData = profileResponse.data;
      setUserProfile((prev) => ({
        ...prev,
        ...profileData.data,
        profileImage:
          profileData.data.picture ||
          profileData.data.profileImage ||
          prev.profileImage,
      }));

      setProfileImage(null);
      onProfileClose();

      // Refresh profile data to ensure everything is in sync
      const currentUser = await getCurrentAuthUser();
      if (currentUser) {
        fetchUserProfile(currentUser);
        // Also update the global store with the new profile data
        try {
          const response = await apiClient.get(API_ENDPOINTS.GET_CURRENT_USER);
          if (response.data) {
            useProductStore.getState().setCurrentUserInfo(response.data);
          }
        } catch (error) {}
      }
    } catch (error) {
      toast.error(
        "Update failed",
        error.message || "Unable to update profile."
      );
    }
  };

  const getFollowers = async (userId) => {
    try {
      const user = await getCurrentAuthUser();
      if (!user) throw new Error("User not authenticated");

      const response = await apiClient.get(
        API_ENDPOINTS.USERS_FOLLOWERS(userId)
      );
      const data = response.data;

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch followers");
      }

      return Array.isArray(data.data) ? data.data : [];
    } catch (error) {
      toast.error("Error", error.message);
      return [];
    }
  };

  const getFollowing = async (userId) => {
    try {
      const user = await getCurrentAuthUser();
      if (!user) throw new Error("User not authenticated");

      const response = await apiClient.get(
        API_ENDPOINTS.USERS_FOLLOWING(userId)
      );
      const data = response.data;

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch following");
      }

      return Array.isArray(data.data) ? data.data : [];
    } catch (error) {
      toast.error("Error", error.message);
      return [];
    }
  };

  if (isLoading) {
    return (
      <Container maxW="container.xl" py={12}>
        <Center minH="50vh">
          <LoadingIndicator variant="page" />
        </Center>
      </Container>
    );
  }

  if (!isSignedIn) {
    return <SignedOutTabPrompt variant="profile" />;
  }

  return (
    <>
      <Container
        maxW="container.xl"
        pt={isCapacitorNative ? 4 : { base: "6.5rem", md: 28 }}
        pb={12}
      >
      <Box maxW="800px" mx="auto" w="full" pt={{ base: 2, md: 4 }}>
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
            <Box
              as="button"
              type="button"
              textAlign="center"
              onClick={async () => {
                const followers = await getFollowers(uid);
                setFollowersList(followers);
                setIsFollowersOpen(true);
              }}
            >
              <Text fontWeight="500" color={colors.textPrimary}>
                {userProfile.followersCount}
              </Text>
              <Text fontSize="sm" color={colors.textMuted} mt={1}>
                Followers
              </Text>
            </Box>
            <Box
              as="button"
              type="button"
              textAlign="center"
              onClick={async () => {
                const following = await getFollowing(uid);
                setFollowingList(following);
                setIsFollowingOpen(true);
              }}
            >
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

          {followRequests.length > 0 && (
            <Button
              mt={8}
              onClick={() => setIsFollowersOpen(true)}
              variant="outline"
              color={colors.textPrimary}
              borderColor={colors.borderColor}
              borderRadius="full"
              fontWeight="500"
              _hover={{ bg: colors.bgHover, borderColor: colors.borderColorInput }}
            >
              {followRequests.length} follow {followRequests.length === 1 ? "request" : "requests"}
            </Button>
          )}
        </Box>
      </Box>

      {/* Posts Section */}
      <VStack spacing={8} mt={6}>
        <Heading
          size="md"
          fontWeight="500"
          color={colors.textPrimary}
          letterSpacing="-0.02em"
        >
          Workouts
        </Heading>
        {isLoading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            height="200px"
          >
            <LoadingIndicator
              variant="hero"
              chakraColor={colors.textSecondary}
            />
          </Box>
        ) : entries.length > 0 ? (
          <>
            <Suspense
              fallback={
                <Box display="flex" justifyContent="center" py={8}>
                  <LoadingIndicator
                    variant="hero"
                    chakraColor={colors.textSecondary}
                  />
                </Box>
              }
            >
              <SimpleGrid
                columns={{ base: 1, md: 2, lg: 3 }}
                spacing={10}
                w={"full"}
                alignItems="stretch"
                justifyItems="stretch"
              >
                {entries.map((entry, index) => (
                  <ProductCard
                    key={entry._id}
                    entry={entry}
                    priority={index < 3}
                    isOwner={uid === entry.uid}
                    onUpdate={handlePostUpdate}
                    onDelete={handlePostDelete}
                  />
                ))}
              </SimpleGrid>
            </Suspense>
            {hasMore ? (
              <Box ref={sentinelRef} w="full" py={4} aria-hidden>
                {isLoadingMore ? (
                  <LoadingIndicator
                    variant="hero"
                    chakraColor={colors.textSecondary}
                  />
                ) : null}
              </Box>
            ) : null}
          </>
        ) : (
          <VStack spacing={3} py={6}>
            <Text>No workouts yet</Text>
            <Button
              as={Link}
              to="/create"
              variant="outline"
              color={colors.textPrimary}
              borderColor={colors.borderColor}
              borderRadius="full"
              fontWeight="500"
              h="48px"
              px={6}
              _hover={{ bg: colors.bgHover, borderColor: colors.borderColorInput }}
            >
              Log a workout
            </Button>
          </VStack>
        )}
      </VStack>

      {/* Followers Modal */}
      <Modal
        isOpen={isFollowersOpen}
        onClose={closeFollowers}
        closeOnOverlayClick
        closeOnEsc
      >
        <ModalOverlay />
        <ModalContent ref={followersDialogRef} bg={colors.bgCard}>
          <ModalHeader color={colors.textPrimary} fontWeight="500">
            Followers
          </ModalHeader>
          <ModalCloseButton color={colors.textMuted} />
          <ModalBody bg={colors.bgCard}>
            {followRequests.length > 0 && (
              <Box mb={6}>
            <Heading size="sm" mb={1} color={colors.textPrimary} fontWeight="500">
              Requests
            </Heading>
            <Text fontSize="sm" color={colors.textMuted} mb={4} lineHeight="1.7">
              People waiting to follow you.
            </Text>
                <VStack align="start" spacing={3}>
                  {followRequests.map((request) => (
                    <Flex
                      key={request._id}
                      align="center"
                      justify="space-between"
                      w="full"
                      py={3}
                      borderRadius="xl"
                      _hover={{ bg: colors.bgMuted }}
                    >
                      <Flex align="center" flex={1}>
                        <Link
                          to={`/user/${request.requester.uid}`}
                          onClick={closeFollowers}
                        >
                          <Avatar
                            src={request.requester.picture}
                            size="sm"
                            mr={3}
                          />
                        </Link>
                        <Link
                          to={`/user/${request.requester.uid}`}
                          onClick={closeFollowers}
                        >
                          <Box flex={1}>
                            <Text
                              fontWeight="medium"
                              fontSize="md"
                              color={colors.textPrimary}
                              _hover={{ textDecoration: "underline" }}
                            >
                              {request.requester.name ||
                                request.requester.username}
                            </Text>
                            {request.requester.username &&
                              request.requester.name && (
                                <Text fontSize="sm" color={colors.textMuted}>
                                  @{request.requester.username}
                                </Text>
                              )}
                            {request.requester.bio && (
                              <Text
                                fontSize="xs"
                                color={colors.textMuted}
                                mt={1}
                                noOfLines={2}
                              >
                                {request.requester.bio}
                              </Text>
                            )}
                          </Box>
                        </Link>
                      </Flex>
                      <HStack spacing={2} ml={4}>
                        <Button
                          size="sm"
                          variant="outline"
                          borderRadius="full"
                          fontWeight="500"
                          color={colors.textPrimary}
                          borderColor={colors.borderColor}
                          _hover={{ bg: colors.bgHover, borderColor: colors.borderColorInput }}
                          onClick={() =>
                            handleFollowRequestAction(request._id, "accept")
                          }
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          borderRadius="full"
                          fontWeight="500"
                          color={colors.textMuted}
                          borderColor={colors.borderColor}
                          _hover={{ bg: colors.bgHover, borderColor: colors.borderColorInput }}
                          onClick={() =>
                            handleFollowRequestAction(request._id, "reject")
                          }
                        >
                          Decline
                        </Button>
                      </HStack>
                    </Flex>
                  ))}
                </VStack>
              </Box>
            )}

            <Heading size="sm" mb={1} mt={followRequests.length > 0 ? 6 : 0} color={colors.textPrimary} fontWeight="500">
              Followers
            </Heading>
            <Text fontSize="sm" color={colors.textMuted} mb={4} lineHeight="1.7">
              People who follow you.
            </Text>
            {followersList.length === 0 ? (
              <Text color={colors.textMuted}>No followers yet</Text>
            ) : (
              <VStack align="start" spacing={4} pb={4}>
                {followersList.map((user) => (
                  <Flex
                    key={user.uid}
                    align="center"
                    justify="space-between"
                    w="full"
                    p={2}
                    borderRadius="md"
                    _hover={{ bg: colors.bgMuted }}
                  >
                    <Flex align="center" flex={1}>
                      <Link to={`/user/${user.uid}`}>
                        <Avatar
                          name={user.name || user.username}
                          src={user.picture || undefined}
                          bg={colors.bgMuted}
                          color={colors.textPrimary}
                          size="sm"
                          mr={3}
                        />
                      </Link>
                      <Link to={`/user/${user.uid}`}>
                        <Box>
                          <Text
                            fontWeight="medium"
                            color={colors.textPrimary}
                            _hover={{ textDecoration: "underline" }}
                          >
                            {user.name || user.username}
                          </Text>
                          {user.username && user.name && (
                            <Text fontSize="sm" color={colors.textMuted}>
                              @{user.username}
                            </Text>
                          )}
                          {user.bio && (
                            <Text
                              fontSize="xs"
                              color={colors.textMuted}
                              noOfLines={1}
                            >
                              {user.bio}
                            </Text>
                          )}
                        </Box>
                      </Link>
                    </Flex>
                  </Flex>
                ))}
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Following Modal */}
      <Modal isOpen={isFollowingOpen} onClose={() => setIsFollowingOpen(false)}>
        <ModalOverlay />
        <ModalContent bg={colors.bgCard}>
          <ModalHeader color={colors.textPrimary} bg={colors.bgCard}>
            Following
          </ModalHeader>
          <ModalCloseButton color={colors.textMuted} />
          <ModalBody bg={colors.bgCard}>
            {followingList.length === 0 ? (
              <Text color={colors.textMuted}>Not following anyone yet</Text>
            ) : (
              <VStack align="start" spacing={4} pb={4}>
                {followingList.map((user) => (
                  <Flex
                    key={user.uid}
                    align="center"
                    justify="space-between"
                    w="full"
                    p={2}
                    borderRadius="md"
                    _hover={{ bg: colors.bgMuted }}
                  >
                    <Flex align="center" flex={1}>
                      <Link to={`/user/${user.uid}`}>
                        <Avatar
                          name={user.name || user.username}
                          src={user.picture || undefined}
                          bg={colors.bgMuted}
                          color={colors.textPrimary}
                          size="sm"
                          mr={3}
                        />
                      </Link>
                      <Link to={`/user/${user.uid}`}>
                        <Box>
                          <Text
                            fontWeight="medium"
                            color={colors.textPrimary}
                            _hover={{ textDecoration: "underline" }}
                          >
                            {user.name || user.username}
                          </Text>
                          {user.username && user.name && (
                            <Text fontSize="sm" color={colors.textMuted}>
                              @{user.username}
                            </Text>
                          )}
                          {user.bio && (
                            <Text
                              fontSize="xs"
                              color={colors.textMuted}
                              noOfLines={1}
                            >
                              {user.bio}
                            </Text>
                          )}
                        </Box>
                      </Link>
                    </Flex>
                  </Flex>
                ))}
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Profile Edit Modal */}
      <Modal isOpen={isProfileOpen} onClose={onProfileClose}>
        <form onSubmit={handleProfileSubmit}>
          <ModalOverlay />
          <ModalContent bg={colors.bgCard}>
            <ModalHeader color={colors.textPrimary} bg={colors.bgCard}>
              Update Profile
            </ModalHeader>
            <ModalCloseButton color={colors.textMuted} />
            <ModalBody bg={colors.bgCard}>
              <VStack spacing={4}>
                <Avatar
                  name={userProfile.name || userProfile.username}
                  src={userProfile.profileImage || undefined}
                  boxSize="150px"
                  bg={colors.bgMuted}
                  color={colors.textPrimary}
                />
                <FileUploader
                  handleFile={handleProfileImageUpload}
                  accept="image/jpeg,image/png,image/gif"
                  maxWidthOrHeight={512}
                  cropAspect={PROFILE_IMAGE_ASPECT}
                />
                <Input
                  type="text"
                  name="name"
                  value={userProfile.name}
                  onChange={(e) =>
                    setUserProfile((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Name"
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                  borderRadius="full"
                  _placeholder={{ color: colors.textMuted }}
                />
                <Input
                  type="text"
                  name="username"
                  value={userProfile.username}
                  onChange={(e) =>
                    setUserProfile((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  placeholder="Username"
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                  borderRadius="full"
                  _placeholder={{ color: colors.textMuted }}
                />
                <Text fontSize="xs" color={colors.textMuted} textAlign="center">
                  Username must be unique and cannot contain spaces
                </Text>
                <Input
                  type="text"
                  name="goal"
                  value={userProfile.goal}
                  onChange={(e) =>
                    setUserProfile((prev) => ({
                      ...prev,
                      goal: e.target.value,
                    }))
                  }
                  placeholder="Fitness Goal"
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                  borderRadius="full"
                  _placeholder={{ color: colors.textMuted }}
                />
                <Textarea
                  name="bio"
                  value={userProfile.bio}
                  onChange={(e) =>
                    setUserProfile((prev) => ({ ...prev, bio: e.target.value }))
                  }
                  placeholder="Bio"
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                  borderRadius="2xl"
                  _placeholder={{ color: colors.textMuted }}
                />
                <Input
                  type="text"
                  name="gymName"
                  value={userProfile.gymName}
                  onChange={(e) =>
                    setUserProfile((prev) => ({
                      ...prev,
                      gymName: e.target.value,
                    }))
                  }
                  placeholder="Gym Name"
                  color={colors.textPrimary}
                  borderColor={colors.borderColorInput}
                  borderRadius="full"
                  _placeholder={{ color: colors.textMuted }}
                />
              </VStack>
            </ModalBody>
            <ModalFooter bg={colors.bgCard} gap={3}>
              <Button
                type="submit"
                variant="outline"
                borderRadius="full"
                fontWeight="500"
                color={colors.textPrimary}
                borderColor={colors.borderColor}
                _hover={{ bg: colors.bgHover, borderColor: colors.borderColorInput }}
              >
                Save changes
              </Button>
              <Button
                onClick={onProfileClose}
                variant="ghost"
                borderRadius="full"
                fontWeight="500"
                color={colors.textMuted}
                _hover={{ bg: colors.bgHover }}
              >
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </form>
      </Modal>

      {/* Background Edit Modal */}
      {/* Privacy Settings Modal */}
      <PrivacySettings
        isOpen={isPrivacyOpen}
        onClose={onPrivacyClose}
        isModal={true}
      />
      </Container>
    </>
  );
};

export default ProfilePage;
