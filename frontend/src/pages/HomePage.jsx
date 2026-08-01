import {
  Container,
  SimpleGrid,
  Text,
  VStack,
  Box,
  useColorModeValue,
  Flex,
  HStack,
} from "@chakra-ui/react";
import { LoadingIndicator } from "../components/loading";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useProductStore } from "../store/product";
import { supabase } from "../supabase/supabase";
import { Hero } from "../components/Hero";
import { HomeLandingSections } from "../components/HomeLandingSections";
import axios from "axios";
import { API_ENDPOINTS, apiClient } from "../config/api";
import PaginationComponent from "../components/Pagination";
import ClaimedWorkoutsModal from "../components/ClaimedWorkoutsModal";
import { useCustomToast } from "../hooks/useCustomToast";
import { getCurrentAuthUser } from "../utils/auth";
import { cn } from "../lib/utils";
import { landingDarkMainCanvas } from "../lib/homeLandingDarkTheme";
import { useTheme } from "../contexts/ThemeContext";
import ProductPreviewSection from "../components/ProductPreviewSection";
import { FiPlus } from "react-icons/fi";
import { isCapacitorNative as getIsCapacitorNative } from "../utils/isNativePlatform";
import WorkoutHabitWidgetPreview from "../components/WorkoutHabitWidgetPreview";
import ProductCard from "../components/ProductCard";

const isCapacitorNative = getIsCapacitorNative();
/** Smaller pages on native reduce feed DOM + ProductCard instances per request. */
const HOME_FEED_PAGE_SIZE = isCapacitorNative ? 4 : 6;

const isRequestAbortError = (err) =>
  axios.isCancel?.(err) ||
  err?.code === "ERR_CANCELED" ||
  err?.name === "CanceledError" ||
  err?.name === "AbortError";

const HomePage = () => {
  const {
    clearEntrys,
    setHomeFeedCache,
    clearHomeFeedCache,
    feedCacheTtlMs,
  } = useProductStore();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uid, setUid] = useState(null);
  const [entries, setEntries] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(HOME_FEED_PAGE_SIZE);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalPosts: 0,
    limit: HOME_FEED_PAGE_SIZE,
  });
  const [profileCache, setProfileCache] = useState(new Map());
  const [habitDetailEntry, setHabitDetailEntry] = useState(null);
  const toast = useCustomToast();
  const spinnerColor = useColorModeValue("gray.700", "gray.400");
  const { currentTheme } = useTheme();
  const navigate = useNavigate();

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleHabitDayDoubleClick = useCallback(
    (day) => {
      if (!day?.workedOut || !day.entryId) return;
      if (String(day.entryId).startsWith("optimistic-")) return;

      const fromFeed = entries.find(
        (entry) => String(entry._id) === String(day.entryId),
      );
      if (fromFeed) {
        setHabitDetailEntry(fromFeed);
        return;
      }

      setHabitDetailEntry({
        _id: day.entryId,
        name: day.workoutName || "Workout",
        description: day.workoutDescription || "",
        image: day.image || "",
        likes: Array.isArray(day.likes) ? day.likes : [],
        comments: Array.isArray(day.comments) ? day.comments : [],
        createdAt: day.createdAt || new Date().toISOString(),
        uid: day.uid || uid,
        ownerId: day.uid || uid,
      });
    },
    [entries, uid],
  );

  // Reset to page 1 when signed-in user changes (before feed fetch effect runs)
  useLayoutEffect(() => {
    setCurrentPage(1);
  }, [uid]);

  useEffect(() => {
    const syncAuth = async () => {
      try {
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
          clearHomeFeedCache();
          setPagination({
            currentPage: 1,
            totalPages: 1,
            totalPosts: 0,
            limit,
          });
          clearEntrys();
          useProductStore.getState().setCurrentUser(null);
          setIsLoading(false);
        }
      } finally {
        useProductStore.getState().setAuthBootstrapCompleteAt(Date.now());
        setIsAuthReady(true);
      }
      // When signed in, keep isLoading true until fetchHomeFeed finishes so we do not
      // flash a second loading state after auth (feed effect sets loading + completes).
    };

    syncAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          // Supabase can emit events like TOKEN_REFRESHED when the tab regains focus.
          // We should not force the feed into a full loading state for those.
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
          setUid((prevUid) => (prevUid === user.uid ? prevUid : user.uid));
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

  // Single home-feed request (server merges self + following, paginated)
  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

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
        // Read cache imperatively — listing `homeFeedCache` as an effect dependency
        // re-ran this effect whenever we wrote the cache, aborted the in-flight request,
        // and skipped applying results so the grid stayed empty until pagination changed.
        const cacheSnapshot = useProductStore.getState().homeFeedCache;

        // Restore cached pages instantly; stale pages can refresh in the background.
        const cachedForPage =
          cacheSnapshot &&
          cacheSnapshot.uid === uid &&
          cacheSnapshot.page === currentPage &&
          cacheSnapshot.limit === limit;

        if (cachedForPage) {
          if (cancelled) return;
          setEntries(cacheSnapshot.entries || []);
          setPagination(
            cacheSnapshot.pagination || {
              currentPage,
              totalPages: 1,
              totalPosts: cacheSnapshot.entries?.length || 0,
              limit,
            }
          );
          setIsLoading(false);
          if (Date.now() - cacheSnapshot.cachedAt < feedCacheTtlMs) {
            return;
          }
        }

        if (!cachedForPage) {
          setIsLoading(true);
        }
        // Count total posts only on page 1; repeats are expensive and this flag used to
        // stay true whenever totalPosts was still 0, forcing count on every page request.
        const includeCount = currentPage === 1;
        const response = await apiClient.get(
          API_ENDPOINTS.HOME_FEED(currentPage, limit, includeCount),
          { signal: ac.signal }
        );
        const data = response.data;

        if (!data.success || !Array.isArray(data.data)) {
          throw new Error(data.message || "Failed to load feed");
        }

        if (cancelled) return;

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
          authorProfile: post.authorProfile || null,
          trainerProfile: post.trainerProfile || null,
        }));

        if (cancelled) return;

        // Keep in-flight optimistic creates that the server response may not include yet.
        const prevCache = useProductStore.getState().homeFeedCache;
        const pendingOptimistic =
          currentPage === 1 && prevCache?.uid === uid
            ? (prevCache.entries || []).filter(
                (entry) =>
                  entry?.isOptimistic &&
                  !normalized.some(
                    (post) => String(post._id) === String(entry._id),
                  ),
              )
            : [];
        const mergedEntries =
          pendingOptimistic.length > 0
            ? [...pendingOptimistic, ...normalized].slice(0, limit)
            : normalized;

        setEntries(mergedEntries);

        const p = data.pagination;
        if (p) {
          setPagination((prev) => ({
            currentPage: p.currentPage ?? currentPage,
            totalPages: p.totalPages ?? prev.totalPages,
            totalPosts: p.totalPosts ?? prev.totalPosts,
            limit: p.limit ?? limit,
          }));
        }

        setHomeFeedCache({
          uid,
          page: currentPage,
          limit,
          entries: mergedEntries,
          pagination: p
            ? {
                currentPage: p.currentPage ?? currentPage,
                totalPages: p.totalPages ?? pagination.totalPages,
                totalPosts: p.totalPosts ?? pagination.totalPosts,
                limit: p.limit ?? limit,
              }
            : {
                currentPage,
                totalPages: pagination.totalPages,
                totalPosts: pagination.totalPosts,
                limit,
              },
          cachedAt: Date.now(),
        });

        if (currentPage === 1 && normalized.length === 0) {
          toast.info(
            "Empty feed",
            "No posts available. Create or follow users to see more."
          );
        }
      } catch (error) {
        if (cancelled || isRequestAbortError(error)) {
          return;
        }
        setEntries([]);
        toast.error("Error", error.message || "Failed to load feed");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchHomeFeed();

    return () => {
      cancelled = true;
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast from useCustomToast is not referentially stable
  }, [uid, currentPage, limit, feedCacheTtlMs, setHomeFeedCache]);

  // Apply optimistic home-feed cache writes while this page stays mounted (native tabs).
  useEffect(() => {
    if (!uid || currentPage !== 1) return undefined;

    return useProductStore.subscribe((state, prevState) => {
      const cache = state.homeFeedCache;
      if (!cache || cache === prevState.homeFeedCache) return;
      if (
        cache.uid !== uid ||
        cache.page !== currentPage ||
        cache.limit !== limit
      ) {
        return;
      }

      setEntries(cache.entries || []);
      if (cache.pagination) {
        setPagination(cache.pagination);
      }
      setIsLoading(false);
    });
  }, [uid, currentPage, limit]);

  const handleUpdateEntry = (pid, updatedEntry) => {
    setEntries((prevEntries) =>
      prevEntries.map((entry) =>
        entry._id === pid ? { ...entry, ...updatedEntry } : entry
      )
    );
  };

  const handleDeleteEntry = (pid) => {
    const idStr = String(pid);
    setEntries((prev) => prev.filter((e) => String(e._id) !== idStr));
    setPagination((prev) => {
      const totalPosts = Math.max(0, prev.totalPosts - 1);
      const totalPages = Math.max(1, Math.ceil(totalPosts / prev.limit));
      return { ...prev, totalPosts, totalPages };
    });
  };

  useEffect(() => {
    if (currentPage > pagination.totalPages && pagination.totalPages >= 1) {
      setCurrentPage(pagination.totalPages);
    }
  }, [currentPage, pagination.totalPages]);

  // Web: wait for auth before showing guest vs feed. Native: show marketing immediately
  // so the feed tab is never an empty shell or a login screen while session hydrates.
  if (!isAuthReady && !isCapacitorNative) {
    return (
      <Container maxW="container.xl" className="text-center z-0 relative">
        <Flex
          minH="50vh"
          pt={{ base: "16px", md: "112px" }}
          align="center"
          justify="center"
          aria-busy
          aria-label="Checking session"
        >
          <LoadingIndicator variant="hero" chakraColor={spinnerColor} />
        </Flex>
      </Container>
    );
  }

  const showSignedInFeed = isAuthReady && isSignedIn;

  return (
    <>
      {showSignedInFeed ? (
        <>
          {/* Web already mounts `HeroHeader` globally (App.jsx). Only show this
              feed header on native builds where `HeroHeader` is not mounted. */}
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
                    <button
                      type="button"
                      onClick={() => navigate("/create")}
                      aria-label="Create post"
                      className={cn(
                        "inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                        currentTheme === "light"
                          ? "text-gray-700 hover:bg-gray-100"
                          : "text-zinc-200/90 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <FiPlus className="h-5 w-5" />
                    </button>

                    <div className="pointer-events-none absolute left-1/2 -translate-x-1/2">
                      <span className="text-xl uppercase bg-gradient-to-r from-blue-300 to-gray-400 bg-clip-text text-transparent">
                        Ethereal Gains
                      </span>
                    </div>

                    <HStack spacing={1} />
                  </div>
                </div>
              </div>
            </nav>
          ) : null}

          <Container maxW="container.xl" className="text-center z-0 relative">
            <VStack
              spacing={8}
              className={cn(
                isCapacitorNative ? "pt-4" : "pt-[6.5rem] md:pt-28",
              )}
            >
              <WorkoutHabitWidgetPreview
                refreshKey={`${uid}-${pagination.totalPosts}-${entries[0]?._id || "none"}`}
                onDayDoubleClick={handleHabitDayDoubleClick}
              />

              {habitDetailEntry ? (
                <Box
                  position="fixed"
                  w={0}
                  h={0}
                  overflow="hidden"
                  opacity={0}
                  pointerEvents="none"
                  aria-hidden
                >
                  <ProductCard
                    key={`habit-detail-${habitDetailEntry._id}`}
                    entry={habitDetailEntry}
                    isOwner={
                      uid ===
                      (habitDetailEntry.ownerId || habitDetailEntry.uid)
                    }
                    onUpdate={handleUpdateEntry}
                    onDelete={(pid) => {
                      handleDeleteEntry(pid);
                      setHabitDetailEntry(null);
                    }}
                    profileCache={profileCache}
                    detailOpen
                    onDetailOpenChange={(open) => {
                      if (!open) setHabitDetailEntry(null);
                    }}
                  />
                </Box>
              ) : null}

              {uid && isLoading ? (
                <Box
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  height="200px"
                >
                  <LoadingIndicator variant="hero" chakraColor={spinnerColor} />
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
                    alignItems="stretch"
                    justifyItems="stretch"
                  >
                    {entries.map((entry, index) => (
                      <ProductCard
                        key={entry._id}
                        entry={entry}
                        priority={index < 9}
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
                          color="blue.400"
                          _hover={{ textDecoration: "underline" }}
                        >
                          Follow some users
                        </Text>
                      </Link>{" "}
                      or{" "}
                      <Link to={"/create"}>
                        <Text
                          as="span"
                          color="blue.400"
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
          </Container>
        </>
      ) : (
        <div className="landing-no-theme-chrome-fade">
          <Hero appGuestMarketing={isCapacitorNative} />
          <ProductPreviewSection />
          <div
            className={cn(
              "w-full min-w-0 bg-gradient-to-br from-zinc-200/75 via-zinc-50 to-white",
              landingDarkMainCanvas,
            )}
          >
            <Container maxW="container.xl" className="text-center z-0 relative">
              <HomeLandingSections />
            </Container>
            <footer className="border-t border-slate-200/80 bg-white/80 py-6 dark:border-[#1e3f5c]/50 dark:bg-[#071c2c]/92">
              <Container maxW="container.xl">
                <div className="flex flex-col items-center justify-between gap-3 text-sm text-slate-700 dark:text-slate-300 sm:flex-row">
                  <p>Copyright 2026 Ethereal Gains. All rights reserved.</p>
                  <div className="flex items-center gap-4">
                    <Link
                      to="/privacy-policy"
                      className="font-medium text-slate-900 underline-offset-4 hover:underline dark:text-slate-100"
                    >
                      Privacy Policy
                    </Link>
                    <Link
                      to="/terms-of-service"
                      className="font-medium text-slate-900 underline-offset-4 hover:underline dark:text-slate-100"
                    >
                      Terms of Service
                    </Link>
                  </div>
                </div>
              </Container>
            </footer>
          </div>
        </div>
      )}

      <ClaimedWorkoutsModal
        isOpen={showClaimedWorkoutsModal}
        onClose={() => setShowClaimedWorkoutsModal(false)}
        claimedWorkouts={claimedWorkouts}
      />
    </>
  );
};

export default HomePage;
