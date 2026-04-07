import {
  Container,
  SimpleGrid,
  Text,
  VStack,
  Button,
  Box,
  Spinner,
  useColorModeValue,
} from "@chakra-ui/react";
import {
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Link } from "react-router-dom";
import { useProductStore } from "../store/product";
import ProductCard from "../components/ProductCard";
import { supabase } from "../supabase/supabase";
import { Hero } from "../components/Hero";
import { SlArrowRight, SlArrowLeft } from "react-icons/sl";
import { API_ENDPOINTS, apiClient } from "../config/api";
import PaginationComponent from "../components/Pagination";
import ClaimedWorkoutsModal from "../components/ClaimedWorkoutsModal";
import { useCustomToast } from "../hooks/useCustomToast";
import { getCurrentAuthUser, signOutAll } from "../utils/auth";
import { useIosAwareGoogleOAuth } from "../hooks/useIosAwareGoogleOAuth";

// Optimized feed loading with lazy loading and caching
const HomePage = () => {
  const { clearEntrys, updateEntry } = useProductStore();
  const { requestGoogleOAuth, IosGoogleAuthModal } = useIosAwareGoogleOAuth();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
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
  const [profileCache, setProfileCache] = useState(new Map()); // Cache for profile images
  const toast = useCustomToast();
  const spinnerColor = useColorModeValue("gray.700", "gray.400");

  // Performance optimization refs
  const resizeTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const profileCacheRef = useRef(profileCache);

  useEffect(() => {
    profileCacheRef.current = profileCache;
  }, [profileCache]);

  // Batch-load avatars for everyone on the current feed page (not only following list)
  useEffect(() => {
    if (!uid || entries.length === 0) return;

    const ids = [
      ...new Set(
        entries.flatMap((e) =>
          [e.uid, e.ownerId, e.trainerUid].filter(Boolean)
        )
      ),
    ];

    let cancelled = false;

    (async () => {
      const authUser = await getCurrentAuthUser();
      if (!authUser || cancelled) return;

      const uncached = ids.filter((id) => !profileCacheRef.current.has(id));
      if (uncached.length === 0) return;

      try {
        const response = await apiClient.post(
          API_ENDPOINTS.BATCH_PROFILE_IMAGES,
          { uids: uncached }
        );
        if (cancelled || !response.data?.success || !response.data?.data) {
          return;
        }

        setProfileCache((prev) => {
          const next = new Map(prev);
          for (const row of response.data.data) {
            next.set(row.uid, {
              uid: row.uid,
              profileImage: row.profileImage,
              displayName: row.displayName,
              isUsername: row.isUsername,
            });
          }
          return next;
        });
      } catch {
        // ProductCard deduped fallback can still load single images
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [entries, uid]);

  // Memoized function to handle page change
  const handlePageChange = useCallback(
    (newPage) => {
      if (newPage >= 1 && newPage <= pagination.totalPages) {
        setCurrentPage(newPage);
      }
    },
    [pagination.totalPages, currentPage]
  );

  // Reset to page 1 when signed-in user changes (before feed fetch effect runs)
  useLayoutEffect(() => {
    setCurrentPage(1);
  }, [uid]);

  // Optimized auth state handler
  useEffect(() => {
    const syncAuth = async () => {
      const user = await getCurrentAuthUser();
      if (user) {
        setIsSignedIn(true);
        setUid(user.uid);
        useProductStore.getState().setCurrentUser(user);
      } else {
        setIsSignedIn(false);
        setUid(null);
        setEntries([]);
        setProfileCache(new Map());
        setPagination({
          currentPage: 1,
          totalPages: 1,
          totalPosts: 0,
          limit,
        });
        clearEntrys();
        useProductStore.getState().setCurrentUser(null);
      }
      setIsAuthReady(true);
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
        } else {
          syncAuth();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [clearEntrys]);

  // Get current user info from store
  const currentUserInfo = useProductStore((state) => state.currentUserInfo);

  // Get claimed workouts state from store
  const claimedWorkouts = useProductStore((state) => state.claimedWorkouts);
  const showClaimedWorkoutsModal = useProductStore(
    (state) => state.showClaimedWorkoutsModal
  );
  const setShowClaimedWorkoutsModal = useProductStore(
    (state) => state.setShowClaimedWorkoutsModal
  );

  // Update profile cache when current user's profile picture changes
  useEffect(() => {
    if (currentUserInfo && currentUserInfo.uid) {
      setProfileCache((prevCache) => {
        const newCache = new Map(prevCache);
        newCache.set(currentUserInfo.uid, {
          uid: currentUserInfo.uid,
          profileImage: currentUserInfo.picture,
          displayName:
            currentUserInfo.username || currentUserInfo.name || "Unknown User",
          isUsername: !!currentUserInfo.username,
        });
        return newCache;
      });
    }
  }, [currentUserInfo]);

  // Preload profile images to reduce individual API calls
  const preloadProfileImages = useCallback(
    async (uids) => {
      // Check if user is authenticated before making API call
      const authUser = await getCurrentAuthUser();
      if (!authUser) {
        return; // Skip if not authenticated
      }

      const newCache = new Map(profileCache);
      const uncachedUids = uids.filter((uid) => !newCache.has(uid));

      if (uncachedUids.length === 0) return;

      try {
        // Use the new batch endpoint for better performance
        const response = await apiClient.post(
          API_ENDPOINTS.BATCH_PROFILE_IMAGES,
          {
            uids: uncachedUids,
          }
        );

        if (response.data?.success && response.data?.data) {
          response.data.data.forEach((profile) => {
            newCache.set(profile.uid, {
              uid: profile.uid,
              profileImage: profile.profileImage,
              displayName: profile.displayName,
              isUsername: profile.isUsername,
            });
          });
          setProfileCache(newCache);
        }
      } catch (error) {
        // Fallback to individual requests if batch fails
        const batchSize = 5;
        const batches = [];

        for (let i = 0; i < uncachedUids.length; i += batchSize) {
          batches.push(uncachedUids.slice(i, i + batchSize));
        }

        for (const batch of batches) {
          const promises = batch.map(async (uid) => {
            try {
              const response = await apiClient.get(
                API_ENDPOINTS.PROFILE_IMAGE(uid)
              );
              if (response.data?.success && response.data?.data) {
                return {
                  uid,
                  profileImage: response.data.data.picture,
                  displayName:
                    response.data.data.username ||
                    response.data.data.name ||
                    "Unknown User",
                  isUsername: !!response.data.data.username,
                };
              }
              return null;
            } catch (error) {
              return null;
            }
          });

          const results = await Promise.allSettled(promises);
          results.forEach((result) => {
            if (result.status === "fulfilled" && result.value) {
              newCache.set(result.value.uid, result.value);
            }
          });
        }

        setProfileCache(newCache);
      }
    },
    [profileCache]
  );

  // Optimized following UIDs fetch with caching
  useEffect(() => {
    const fetchFollowing = async () => {
      if (!uid) return;

      try {
        const response = await apiClient.get(
          API_ENDPOINTS.USERS_FOLLOWING(uid)
        );

        const data = response.data;
        if (data.success) {
          const uids = data.data.map((user) => user.uid);
          const uidsToCache = [...new Set([uid, ...uids])];
          preloadProfileImages(uidsToCache).catch(() => {});

          if (uids.length === 0) {
            toast.info(
              "No followed users",
              "Follow users to see their posts in your feed."
            );
          }
        } else {
          throw new Error(data.message || "Failed to fetch following");
        }
      } catch (error) {
        toast.error("Error", error.message || "Failed to load followed users");
      }
    };

    if (uid) {
      fetchFollowing();
    }
    // preloadProfileImages is memoized and stable, safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // Single home-feed request (server merges self + following, paginated)
  useEffect(() => {
    const fetchHomeFeed = async () => {
      if (!uid) {
        setEntries([]);
        setPagination({
          currentPage: 1,
          totalPages: 1,
          totalPosts: 0,
          limit,
        });
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await apiClient.get(
          API_ENDPOINTS.HOME_FEED(currentPage, limit)
        );
        const data = response.data;

        if (!data.success || !Array.isArray(data.data)) {
          throw new Error(data.message || "Failed to load feed");
        }

        const normalized = data.data.map((post) => ({
          _id: post._id,
          name: post.name || "Untitled",
          description: post.description || "No description",
          image: post.image || null,
          likes: Array.isArray(post.likes) ? post.likes : [],
          comments: Array.isArray(post.comments) ? post.comments : [],
          createdAt: post.createdAt || new Date().toISOString(),
          ownerId: post.ownerId || post.uid,
          uid: post.uid,
          trainerUid: post.trainerUid || null,
          trainerName: post.trainerName || null,
          trainerUsername: post.trainerUsername || null,
        }));

        setEntries(normalized);

        const p = data.pagination;
        if (p) {
          setPagination({
            currentPage: p.currentPage ?? currentPage,
            totalPages: p.totalPages ?? 1,
            totalPosts: p.totalPosts ?? normalized.length,
            limit: p.limit ?? limit,
          });
        }

        if (currentPage === 1 && normalized.length === 0) {
          toast.info(
            "Empty feed",
            "No posts available. Create or follow users to see more."
          );
        }
      } catch (error) {
        setEntries([]);
        toast.error("Error", error.message || "Failed to load feed");
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomeFeed();
    // toast is stable from useCustomToast; omit to avoid effect churn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, currentPage, limit]);

  // Memoized entries to prevent unnecessary re-renders
  const memoizedEntries = useMemo(() => entries, [entries]);

  // Optimized update handler
  const handleUpdateEntry = useCallback((pid, updatedEntry) => {
    setEntries((prevEntries) =>
      prevEntries.map((entry) =>
        entry._id === pid ? { ...entry, ...updatedEntry } : entry
      )
    );
  }, []);

  const handleDeleteEntry = useCallback((pid) => {
    const idStr = String(pid);
    setEntries((prev) => prev.filter((e) => String(e._id) !== idStr));
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

  const handleGoogleSignIn = (authMode = "login") => {
    const redirectPath = window.location.pathname + window.location.search;
    requestGoogleOAuth({
      authMode,
      redirectPath,
      debugContext: "HomePage",
      onError: (error) => {
        handleSignOutUser();
        toast.error("Error", error.message || "Failed to sign in");
      },
    });
  };

  const handleSignOutUser = async () => {
    try {
      await signOutAll();
      setUid(null);
      setIsSignedIn(false);
      setEntries([]);
    } catch (error) {
      toast.error("Error", error.message || "Failed to sign out");
    }
  };

  if (!isAuthReady) {
    return (
      <Container maxW="container.xl" className="text-center z-0 relative">
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minH="50vh"
          pt="112px"
        >
          <Spinner
            size="lg"
            thickness="4px"
            speed="1.2s"
            color={spinnerColor}
          />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" className="text-center z-0 relative">
      {isSignedIn ? (
        <>
          <VStack spacing={8} className="pt-[112px]">
            <Text
              fontSize={"22"}
              fontWeight={"bold"}
              bgGradient={"linear(to-r, blue.200, gray.400)"}
              bgClip={"text"}
              textAlign={"center"}
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
                  color={spinnerColor}
                />
              </Box>
            ) : (
              <>
                <SimpleGrid
                  columns={{
                    base: 1,
                    md: 2,
                    lg: 3,
                  }}
                  spacing={10}
                  w={"full"}
                  alignItems="center"
                  justifyItems="center"
                >
                  {memoizedEntries.map((entry) => (
                    <ProductCard
                      key={entry._id}
                      entry={entry}
                      isOwner={
                        uid === (entry.ownerId || entry.uid)
                      }
                      onUpdate={handleUpdateEntry}
                      onDelete={handleDeleteEntry}
                      profileCache={profileCache}
                    />
                  ))}
                </SimpleGrid>
                <PaginationComponent
                  currentPage={currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                  maxVisiblePages={5}
                />
                {entries.length === 0 && (
                  <Text
                    fontSize="xl"
                    textAlign={"center"}
                    fontWeight="bold"
                    color="gray.500"
                  >
                    No posts to show 😢{" "}
                    <Link to={"/profile"}>
                      <Text
                        as="span"
                        color="blue.500"
                        _hover={{ textDecoration: "underline" }}
                      >
                        Follow some users
                      </Text>
                    </Link>{" "}
                    or{" "}
                    <Link to={"/create"}>
                      <Text
                        as="span"
                        color="blue.500"
                        _hover={{ textDecoration: "underline" }}
                      >
                        create a post
                      </Text>
                    </Link>
                  </Text>
                )}
              </>
            )}
          </VStack>
        </>
      ) : (
        <div>
          <Hero handleGoogleSignIn={handleGoogleSignIn} />
        </div>
      )}

      {/* Claimed Workouts Modal */}
      <ClaimedWorkoutsModal
        isOpen={showClaimedWorkoutsModal}
        onClose={() => setShowClaimedWorkoutsModal(false)}
        claimedWorkouts={claimedWorkouts}
      />
      {IosGoogleAuthModal}
    </Container>
  );
};

export default HomePage;
