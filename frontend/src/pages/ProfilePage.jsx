import {
  Container,
  SimpleGrid,
  Text,
  VStack,
  Button,
  Box,
  Spinner,
  Heading,
  Avatar,
  Center,
  Flex,
  Stack,
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
  Badge,
  HStack,
} from "@chakra-ui/react";
import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useProductStore } from "../store/product";
import ProductCard from "../components/ProductCard";
import { FileUploader } from "../components/FileUploader";
import { supabase } from "../supabase/supabase";
import { SlArrowRight, SlArrowLeft } from "react-icons/sl";
import { FiSettings } from "react-icons/fi";
import light from "../assets/light.jpg";
import PaginationComponent from "../components/Pagination";
import night from "../assets/night.jpg";
import defaultBg from "../assets/defaultBg.jpg";
import defaultBgNight from "../assets/defaultBgNight.jpg";
import { useThemeColors } from "../hooks/useThemeColors";
import { useTheme } from "../contexts/ThemeContext";
import { cn } from "../lib/utils";

// Convert Vite asset imports to actual URLs
const lightUrl = new URL("../assets/light.jpg", import.meta.url).href;
const nightUrl = new URL("../assets/night.jpg", import.meta.url).href;
const defaultBgUrl = new URL("../assets/defaultBg.jpg", import.meta.url).href;
const defaultBgNightUrl = new URL(
  "../assets/defaultBgNight.jpg",
  import.meta.url
).href;
import { useCustomToast } from "../hooks/useCustomToast";
import { getCurrentAuthUser, signOutAll } from "../utils/auth";
import { API_ENDPOINTS, apiClient } from "../config/api";
import PrivacySettings from "../components/PrivacySettings";
import { useProductStore as useUiStore } from "../store/product";
import MobileNavMenu from "../components/MobileNavMenu";

const isCapacitorNative =
  typeof window !== "undefined" &&
  window.Capacitor &&
  typeof window.Capacitor.isNativePlatform === "function" &&
  window.Capacitor.isNativePlatform();

const ProfilePage = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uid, setUid] = useState(null);
  const [entries, setEntries] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(6);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalPosts: 0,
    limit: 6,
  });
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
  const [profileImage, setProfileImage] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [isFollowersOpen, setIsFollowersOpen] = useState(false);
  const [isFollowingOpen, setIsFollowingOpen] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [followRequests, setFollowRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const toast = useCustomToast();
  const colors = useThemeColors();
  const { currentTheme } = useTheme();
  const {
    profileTabCache,
    setProfileTabCache,
    clearProfileTabCache,
  } = useUiStore();
  const profileColorMode =
    colors.currentTheme === "light" ? lightUrl : nightUrl;
  const bgColorMode =
    colors.currentTheme === "light" ? defaultBgUrl : defaultBgNightUrl;

  const {
    isOpen: isProfileOpen,
    onOpen: onProfileOpen,
    onClose: onProfileClose,
  } = useDisclosure();
  const {
    isOpen: isBackgroundOpen,
    onOpen: onBackgroundOpen,
    onClose: onBackgroundClose,
  } = useDisclosure();
  const {
    isOpen: isPrivacyOpen,
    onOpen: onPrivacyOpen,
    onClose: onPrivacyClose,
  } = useDisclosure();

  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

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
        if (
          profileTabCache &&
          profileTabCache.uid === user.uid &&
          (profileTabCache.profileLoaded || profileTabCache.postsLoaded) &&
          Date.now() - profileTabCache.cachedAt < 60_000
        ) {
          setIsSignedIn(true);
          setUid(user.uid);
          useProductStore.getState().setCurrentUser(user);
          setCurrentPage(profileTabCache.currentPage ?? 1);
          setEntries(profileTabCache.entries || []);
          setPagination(
            profileTabCache.pagination || {
              currentPage: profileTabCache.currentPage ?? 1,
              totalPages: 1,
              totalPosts: (profileTabCache.entries || []).length,
              limit,
            }
          );
          if (profileTabCache.userProfile) {
            setUserProfile(profileTabCache.userProfile);
          }
          setFollowRequests(profileTabCache.followRequests || []);
          setIsAdmin(Boolean(profileTabCache.isAdmin));
          setIsLoading(false);

          // If posts cache is partial/empty, force-load posts for the current page.
          const restoredPage = profileTabCache.currentPage ?? 1;
          if (!hasUsablePostsCache(profileTabCache, restoredPage)) {
            fetchUserPosts(user.uid, restoredPage);
          }
          // If we only cached posts but never cached profile, fetch profile now.
          if (!hasUsableProfileCache(profileTabCache)) {
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
          if (
            profileTabCache &&
            profileTabCache.uid === user.uid &&
            (profileTabCache.profileLoaded || profileTabCache.postsLoaded) &&
            Date.now() - profileTabCache.cachedAt < 60_000
          ) {
            setCurrentPage(profileTabCache.currentPage ?? 1);
            setEntries(profileTabCache.entries || []);
            setPagination(
              profileTabCache.pagination || {
                currentPage: profileTabCache.currentPage ?? 1,
                totalPages: 1,
                totalPosts: (profileTabCache.entries || []).length,
                limit,
              }
            );
            if (profileTabCache.userProfile) {
              setUserProfile(profileTabCache.userProfile);
            }
            setFollowRequests(profileTabCache.followRequests || []);
            if (!hasUsableProfileCache(profileTabCache)) {
              fetchUserProfile(user);
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
  }, [profileTabCache, clearProfileTabCache]);

  // Fetch posts when page changes. Do not depend on profileTabCache — every cache merge
  // bumps cachedAt and would retrigger this effect (many duplicate requests on errors).
  useEffect(() => {
    if (!uid) return;
    const cache = useProductStore.getState().profileTabCache;
    if (
      cache?.uid === uid &&
      hasUsablePostsCache(cache, currentPage) &&
      Date.now() - cache.cachedAt < 60_000
    ) {
      return;
    }
    fetchUserPosts(uid, currentPage);
  }, [currentPage, uid]);

  // Check admin status when user is signed in
  useEffect(() => {
    if (isSignedIn && uid) {
      const checkAdminStatus = async () => {
        try {
          const response = await apiClient.get(API_ENDPOINTS.CHECK_IS_ADMIN);
          if (response.data.success) {
            const nextIsAdmin = response.data.isAdmin || false;
            setIsAdmin(nextIsAdmin);
            // Only patch admin flags — do not pass entries/pagination/profile from
            // this effect's closure (deps are [isSignedIn, uid]); stale [] would wipe
            // the feed in profileTabCache after posts/profile have loaded.
            setMergedProfileCache({
              uid,
              isAdmin: nextIsAdmin,
              adminLoaded: true,
            });
          }
        } catch (error) {
          // Default to false on error
          setIsAdmin(false);
        }
      };
      checkAdminStatus();
    } else {
      setIsAdmin(false);
    }
  }, [isSignedIn, uid]);

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

      toast.success(
        "Success",
        `Request ${action === "accept" ? "accepted" : "rejected"} successfully`
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
      fetchFollowRequests();
    }
  }, [uid]);

  const fetchUserProfile = async (user) => {
    try {
      const response = await apiClient.get(
        API_ENDPOINTS.GET_USER_PROFILE(user.uid)
      );

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
        profileImage: userData.picture || profileColorMode,
        backgroundPicture: userData.backgroundPicture || bgColorMode,
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

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePostUpdate = async (pid, updatedEntry) => {
    const previousEntries = [...entries];
    const updatedEntries = entries.map((entry) =>
      entry._id === pid ? { ...entry, ...updatedEntry } : entry
    );
    setEntries(updatedEntries);

    try {
      const { success, message, data } = await useProductStore
        .getState()
        .updateEntry(pid, updatedEntry);
      if (!success) {
        setEntries(previousEntries);
        toast.error("Update failed", message || "Unable to update post.");
      } else {
        setEntries((prevEntries) =>
          prevEntries.map((entry) =>
            entry._id === pid ? { ...entry, ...data.data } : entry
          )
        );
      }
    } catch (error) {
      setEntries(previousEntries);
      toast.error("Update failed", error.message || "Unable to update post.");
    }
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

  const handleBackgroundImageUpload = (file) => {
    if (file) {
      setBackgroundImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserProfile((prev) => ({
          ...prev,
          backgroundPicture: reader.result,
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

      toast.success(
        "Profile updated",
        "Your profile has been successfully updated."
      );
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

  const handleBackgroundSubmit = async (e) => {
    e.preventDefault();
    const user = await getCurrentAuthUser();
    if (!user) {
      toast.error("Error", "You must be signed in to update your background.");
      return;
    }

    try {
      if (!backgroundImage) {
        throw new Error("No background image selected");
      }

      const backgroundFormData = new FormData();
      backgroundFormData.append("backgroundPicture", backgroundImage);
      backgroundFormData.append("backgroundPictureName", backgroundImage.name);

      const backgroundResponse = await apiClient.post(
        API_ENDPOINTS.UPDATE_USER_BACKGROUND,
        backgroundFormData
      );

      if (!backgroundResponse.data?.success && backgroundResponse.data?.message) {
        throw new Error(
          backgroundResponse.data.message ||
            "Failed to update background picture"
        );
      }

      const backgroundData = backgroundResponse.data;
      setUserProfile((prev) => ({
        ...prev,
        backgroundPicture: backgroundData.data.backgroundPicture,
      }));

      toast.success(
        "Background updated",
        "Your background image has been successfully updated."
      );
      setBackgroundImage(null);
      onBackgroundClose();
    } catch (error) {
      toast.error(
        "Update failed",
        error.message || "Unable to update background image."
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

      // Add fallback for profile pictures
      const followersWithFallback = data.data.map((follower) => ({
        ...follower,
        picture: follower.picture || profileColorMode,
      }));

      return Array.isArray(followersWithFallback) ? followersWithFallback : [];
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

      // Add fallback for profile pictures
      const followingWithFallback = data.data.map((following) => ({
        ...following,
        picture: following.picture || profileColorMode,
      }));

      return Array.isArray(followingWithFallback) ? followingWithFallback : [];
    } catch (error) {
      toast.error("Error", error.message);
      return [];
    }
  };

  if (isLoading) {
    return (
      <Container maxW="container.xl" py={12}>
        <Center minH="50vh">
          <Spinner size="xl" thickness="4px" />
        </Center>
      </Container>
    );
  }

  if (!isSignedIn) {
    return (
      <Container maxW="container.xl" py={12}>
        <Center>
          <VStack spacing={6}>
            <Heading>Please Sign In</Heading>
            <Text>You need to be signed in to view your profile.</Text>
            <Link to="/">
              <Button colorScheme="blue">Go to Home</Button>
            </Link>
          </VStack>
        </Center>
      </Container>
    );
  }

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOutAll();
      toast.success("Signed out", "You’ve been signed out.");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error("Error", error?.message || "Failed to sign out.");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <>
      {/* Web already mounts `HeroHeader` globally (App.jsx). Only show this
          profile header on native builds where `HeroHeader` is not mounted. */}
      {isCapacitorNative ? (
        <nav className="sticky top-0 z-20 w-full">
          <div
            className={cn(
              "w-full border-b px-4 py-[1px] pt-[constant(safe-area-inset-top)] pt-[env(safe-area-inset-top)] transition-all duration-300 backdrop-blur-xl",
              currentTheme === "light"
                ? "border-zinc-200/80 bg-zinc-50/90 shadow-sm"
                : currentTheme === "dark-black"
                  ? "border-neutral-800/55 bg-neutral-950/88"
                  : currentTheme === "dark-blue"
                    ? "border-[rgb(39_39_42_/_6%)] bg-zinc-950/85"
                    : "border-[rgb(39_39_42_/_6%)] bg-zinc-950/88",
            )}
          >
            <div className="mx-auto w-full max-w-7xl">
              <div className="relative flex items-center justify-between py-2">
                <div className="h-10 w-10" aria-hidden />

                <div className="pointer-events-none absolute left-1/2 -translate-x-1/2">
                  <span className="text-xl uppercase bg-gradient-to-r from-blue-300 to-gray-400 bg-clip-text text-transparent">
                    Profile
                  </span>
                </div>

                <HStack spacing={1}>
                  <button
                    type="button"
                    onClick={() => navigate("/settings")}
                    aria-label="Settings"
                    className={cn(
                      "inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                      currentTheme === "light"
                        ? "text-gray-700 hover:bg-gray-100"
                        : "text-zinc-200/90 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <FiSettings className="h-5 w-5" />
                  </button>

                  <MobileNavMenu currentTheme={currentTheme} />
                </HStack>
              </div>
            </div>
          </div>
        </nav>
      ) : null}

      <Container
        maxW="container.xl"
        pt={isCapacitorNative ? 4 : { base: 24, md: 28 }}
        pb={12}
      >
      {/* Profile Section */}
      <Center py={6} mt={0}>
        <Box
          maxW={"580px"}
          w={"full"}
          bg={colors.bgCard}
          boxShadow={"2xl"}
          rounded={"md"}
          overflow={"hidden"}
        >
          <Box position="relative">
            <Image
              h={"120px"}
              w={"full"}
              src={userProfile.backgroundPicture}
              fallbackSrc={bgColorMode}
              objectFit="cover"
              alt="Background"
            />
          </Box>

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
                {userProfile.username && `@${userProfile.username}`}
              </Heading>
              <Text fontSize={"lg"} color={colors.textSecondary}>
                {userProfile.name}
              </Text>
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
              <Stack
                spacing={0}
                align={"center"}
                onClick={async () => {
                  const followers = await getFollowers(uid);
                  setFollowersList(followers);
                  setIsFollowersOpen(true);
                }}
                style={{ cursor: "pointer" }}
              >
                <Text fontWeight={600}>{userProfile.followersCount}</Text>
                <Text fontSize={"sm"} color={colors.textMuted}>
                  Followers
                </Text>
              </Stack>
              <Stack
                spacing={0}
                align={"center"}
                onClick={async () => {
                  const following = await getFollowing(uid);
                  setFollowingList(following);
                  setIsFollowingOpen(true);
                }}
                style={{ cursor: "pointer" }}
              >
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

            {/* Follow Requests Badge */}
            {followRequests.length > 0 && (
              <Box mt={4} textAlign="center">
                <Button
                  onClick={() => setIsFollowersOpen(true)}
                  colorScheme="blue"
                  size="sm"
                  leftIcon={
                    <Badge colorScheme="red" borderRadius="full" px={2}>
                      {followRequests.length}
                    </Badge>
                  }
                >
                  Follow Requests
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Center>

      {/* Posts Section */}
      <VStack spacing={8} mt={6}>
        <Text
          fontSize={"22"}
          fontWeight={"bold"}
          bgGradient={"linear(to-r, blue.200, gray.400)"}
          bgClip={"text"}
        >
          Workout Posts
        </Text>
        {isLoading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            height="200px"
          >
            <Spinner
              size="lg"
              thickness="4px"
              speed="1.2s"
              color={colors.textSecondary}
            />
          </Box>
        ) : entries.length > 0 ? (
          <>
            <SimpleGrid
              columns={{ base: 1, md: 2, lg: 3 }}
              spacing={10}
              w={"full"}
              alignItems="center"
              justifyItems="center"
            >
              {entries.map((entry) => (
                <ProductCard
                  key={entry._id}
                  entry={entry}
                  isOwner={uid === entry.uid}
                  onUpdate={handlePostUpdate}
                  onDelete={handlePostDelete}
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
        ) : (
          <Text>No posts available.</Text>
        )}
      </VStack>

      {/* Followers Modal */}
      <Modal isOpen={isFollowersOpen} onClose={() => setIsFollowersOpen(false)}>
        <ModalOverlay />
        <ModalContent bg={colors.bgCard}>
          <ModalHeader color={colors.textPrimary} bg={colors.bgCard}>
            Followers
            {followRequests.length > 0 && (
              <Badge colorScheme="red" ml={2}>
                {followRequests.length} pending requests
              </Badge>
            )}
          </ModalHeader>
          <ModalCloseButton color={colors.textMuted} />
          <ModalBody bg={colors.bgCard}>
            {followRequests.length > 0 && (
              <Box mb={6}>
                <Heading size="sm" mb={3} color={colors.textPrimary}>
                  Follow Requests
                </Heading>
                <VStack align="start" spacing={3}>
                  {followRequests.map((request) => (
                    <Flex
                      key={request._id}
                      align="center"
                      justify="space-between"
                      w="full"
                      p={3}
                      borderWidth={1}
                      borderRadius="md"
                      bg={colors.bgMuted}
                      borderColor={colors.borderColor}
                    >
                      <Flex align="center" flex={1}>
                        <Link to={`/user/${request.requester.uid}`}>
                          <Avatar
                            src={request.requester.picture}
                            size="sm"
                            mr={3}
                          />
                        </Link>
                        <Link to={`/user/${request.requester.uid}`}>
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
                          colorScheme="green"
                          onClick={() =>
                            handleFollowRequestAction(request._id, "accept")
                          }
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          colorScheme="red"
                          variant="outline"
                          onClick={() =>
                            handleFollowRequestAction(request._id, "reject")
                          }
                        >
                          Reject
                        </Button>
                      </HStack>
                    </Flex>
                  ))}
                </VStack>
              </Box>
            )}

            <Heading size="sm" mb={3} color={colors.textPrimary}>
              Current Followers
            </Heading>
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
                        <Avatar src={user.picture} size="sm" mr={3} />
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
                        <Avatar src={user.picture} size="sm" mr={3} />
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
                <Image
                  src={userProfile.profileImage}
                  alt="Profile Picture"
                  boxSize="150px"
                  objectFit="cover"
                  borderRadius="full"
                />
                <FileUploader
                  handleFile={handleProfileImageUpload}
                  accept="image/jpeg,image/png,image/gif"
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
                  _placeholder={{ color: colors.textMuted }}
                />
              </VStack>
            </ModalBody>
            <ModalFooter bg={colors.bgCard}>
              <Button type="submit" colorScheme="blue" mr={3}>
                Save Changes
              </Button>
              <Button
                onClick={onProfileClose}
                color={colors.textPrimary}
                _hover={{ bg: colors.bgHover }}
              >
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </form>
      </Modal>

      {/* Background Edit Modal */}
      <Modal isOpen={isBackgroundOpen} onClose={onBackgroundClose}>
        <form onSubmit={handleBackgroundSubmit}>
          <ModalOverlay />
          <ModalContent bg={colors.bgCard}>
            <ModalHeader color={colors.textPrimary} bg={colors.bgCard}>
              Update Background
            </ModalHeader>
            <ModalCloseButton color={colors.textMuted} />
            <ModalBody bg={colors.bgCard}>
              <VStack spacing={4}>
                <Image
                  src={userProfile.backgroundPicture}
                  alt="Background Picture"
                  w="full"
                  h="200px"
                  objectFit="cover"
                  borderRadius="md"
                />
                <FileUploader
                  handleFile={handleBackgroundImageUpload}
                  accept="image/jpeg,image/png,image/gif"
                />
              </VStack>
            </ModalBody>
            <ModalFooter bg={colors.bgCard}>
              <Button type="submit" colorScheme="blue" mr={3}>
                Save Changes
              </Button>
              <Button
                onClick={onBackgroundClose}
                color={colors.textPrimary}
                _hover={{ bg: colors.bgHover }}
              >
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </form>
      </Modal>

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
