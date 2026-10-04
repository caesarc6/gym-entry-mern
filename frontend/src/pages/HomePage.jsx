import {
  Container,
  SimpleGrid,
  Text,
  VStack,
  Box,
  Button,
  useColorModeValue,
  Flex,
} from "@chakra-ui/react";
import { LoadingIndicator } from "../components/loading";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useProductStore } from "../store/product";
import { supabase } from "../supabase/supabase";
import { Hero } from "../components/Hero";
import { HomeLandingSections } from "../components/HomeLandingSections";
import axios from "axios";
import { API_ENDPOINTS, apiClient } from "../config/api";
import ClaimedWorkoutsModal from "../components/ClaimedWorkoutsModal";
import { useCustomToast } from "../hooks/useCustomToast";
import { getCurrentAuthUser } from "../utils/auth";
import { cn } from "../lib/utils";
import { landingDarkMainCanvas } from "../lib/homeLandingDarkTheme";
import ProductPreviewSection from "../components/ProductPreviewSection";
import { isCapacitorNative as getIsCapacitorNative } from "../utils/isNativePlatform";
import { feedPageLimit } from "../utils/feedPageLimit";
import WorkoutHabitWidgetPreview from "../components/WorkoutHabitWidgetPreview";
import ProductCard from "../components/ProductCard";
import FeedPullToRefresh from "../components/FeedPullToRefresh";
import { useMirrorPostList } from "../hooks/useMirrorPostList";

const isCapacitorNative = getIsCapacitorNative();
const HOME_FEED_PAGE_SIZE = feedPageLimit();
/** Second home tap within this window reloads the feed. */
const HOME_DOUBLE_TAP_MS = 350;

const normalizeFeedPost = (post) => ({
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
  ownerId: post.ownerId || post.uid,
  uid: post.uid,
  trainerUid: post.trainerUid || null,
  trainerName: post.trainerName || null,
  trainerUsername: post.trainerUsername || null,
  authorProfile: post.authorProfile || null,
  trainerProfile: post.trainerProfile || null,
  isOptimistic: Boolean(post.isOptimistic),
});

const scrollFeedToTop = () => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const behavior = reduceMotion ? "auto" : "smooth";
  window.scrollTo({ top: 0, left: 0, behavior });
  document.scrollingElement?.scrollTo?.({ top: 0, behavior });
  window.dispatchEvent(new CustomEvent("eg:scroll-home-top"));
};

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
  const [feedEpoch, setFeedEpoch] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const skipCacheRef = useRef(false);
  const pageRef = useRef(1);
  const appendLockRef = useRef(false);
  const sentinelRef = useRef(null);
  const isSignedInRef = useRef(false);
  const lastHomeTapAtRef = useRef(0);
  const provisionAttemptedRef = useRef(false);
  const [limit] = useState(HOME_FEED_PAGE_SIZE);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalPosts: 0,
    limit: HOME_FEED_PAGE_SIZE,
  });
  const paginationRef = useRef(pagination);
  paginationRef.current = pagination;
  const { dropIfPresent, entriesRef } = useMirrorPostList({
    entries,
    setEntries,
    ownerUid: uid,
    onRemove: () => {
      setPagination((prev) => {
        const totalPosts = Math.max(0, (prev.totalPosts || 0) - 1);
        const pageSize = prev.limit || HOME_FEED_PAGE_SIZE;
        return {
          ...prev,
          totalPosts,
          totalPages: Math.max(1, Math.ceil(totalPosts / pageSize)),
        };
      });
    },
  });
  const [profileCache, setProfileCache] = useState(new Map());
  const [habitDetailEntry, setHabitDetailEntry] = useState(null);
  const toast = useCustomToast();
  const spinnerColor = useColorModeValue("gray.700", "gray.400");

  isSignedInRef.current = isSignedIn;

  const refreshHomeFeed = useCallback(() => {
    skipCacheRef.current = true;
    pageRef.current = 1;
    setHasMore(false);
    setIsRefreshing(true);
    clearHomeFeedCache();
    setCurrentPage(1);
    setFeedEpoch((epoch) => epoch + 1);
    scrollFeedToTop();
  }, [clearHomeFeedCache]);

  useEffect(() => {
    const reloadHome = () => {
      if (!isSignedInRef.current) {
        scrollFeedToTop();
        return;
      }
      refreshHomeFeed();
    };

    const onHomeRetap = () => {
      const now = Date.now();
      const isDoubleTap = now - lastHomeTapAtRef.current <= HOME_DOUBLE_TAP_MS;
      lastHomeTapAtRef.current = isDoubleTap ? 0 : now;
      if (isDoubleTap) {
        reloadHome();
        return;
      }
      scrollFeedToTop();
    };
    const onHomeRefresh = () => {
      lastHomeTapAtRef.current = 0;
      reloadHome();
    };

    window.addEventListener("eg:home-retap", onHomeRetap);
    window.addEventListener("eg:home-refresh", onHomeRefresh);
    return () => {
      window.removeEventListener("eg:home-retap", onHomeRetap);
      window.removeEventListener("eg:home-refresh", onHomeRefresh);
    };
  }, [refreshHomeFeed]);

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
        setIsRefreshing(false);
        return;
      }

      try {
        const bypassCache = skipCacheRef.current;
        skipCacheRef.current = false;
        // Read cache imperatively — listing `homeFeedCache` as an effect dependency
        // re-ran this effect whenever we wrote the cache, aborted the in-flight request,
        // and skipped applying results so the grid stayed empty until pagination changed.
        const cacheSnapshot = useProductStore.getState().homeFeedCache;

        // Restore cached pages instantly; stale pages can refresh in the background.
        const cachedForPage =
          !bypassCache &&
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
          pageRef.current = 1;
          setHasMore((cacheSnapshot.pagination?.totalPages ?? 1) > 1);
          setIsLoading(false);
          setIsRefreshing(false);
          if (Date.now() - cacheSnapshot.cachedAt < feedCacheTtlMs) {
            return;
          }
        }

        if (!cachedForPage && !bypassCache) {
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

        const normalized = data.data.map(normalizeFeedPost);

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
        pageRef.current = 1;

        const p = data.pagination;
        if (p) {
          setPagination((prev) => ({
            currentPage: p.currentPage ?? currentPage,
            totalPages: p.totalPages ?? prev.totalPages,
            totalPosts: p.totalPosts ?? prev.totalPosts,
            limit: p.limit ?? limit,
          }));
          setHasMore((p.totalPages ?? 1) > 1);
        } else {
          setHasMore(false);
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
      } catch (error) {
        if (cancelled || isRequestAbortError(error)) {
          return;
        }
        const missingAccount =
          error.response?.status === 404 &&
          /user not found/i.test(error.response?.data?.message || "");
        if (missingAccount && !provisionAttemptedRef.current) {
          provisionAttemptedRef.current = true;
          try {
            await apiClient.post(API_ENDPOINTS.PROTECTED);
            if (!cancelled) {
              setFeedEpoch((epoch) => epoch + 1);
              return;
            }
          } catch {
            // Provisioning failed; keep whatever is already on screen.
          }
        }
        const cached = useProductStore.getState().homeFeedCache;
        const keepCached =
          cached?.uid === uid &&
          Array.isArray(cached.entries) &&
          cached.entries.length > 0;
        if (!keepCached) {
          setEntries([]);
          setHasMore(false);
        }
        const serverMessage =
          error.response?.data?.message || error.response?.data?.error;
        toast.error("Error", serverMessage || "Failed to load feed");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    void fetchHomeFeed();

    return () => {
      cancelled = true;
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast from useCustomToast is not referentially stable
  }, [uid, currentPage, limit, feedEpoch, feedCacheTtlMs, setHomeFeedCache]);

  const loadMore = useCallback(async () => {
    if (!uid || appendLockRef.current || isLoading) return;
    const totalPages = paginationRef.current.totalPages || 1;
    if (pageRef.current >= totalPages) return;

    const page = pageRef.current + 1;
    appendLockRef.current = true;
    setIsLoadingMore(true);
    try {
      const response = await apiClient.get(
        API_ENDPOINTS.HOME_FEED(page, limit, false),
      );
      const data = response.data;
      if (!data.success || !Array.isArray(data.data)) {
        throw new Error(data.message || "Failed to load feed");
      }

      const normalized = data.data.map(normalizeFeedPost);
      const prev = entriesRef.current || [];
      const seen = new Set(prev.map((entry) => String(entry._id)));
      const extra = normalized.filter((post) => !seen.has(String(post._id)));
      const next = extra.length ? [...prev, ...extra] : prev;
      entriesRef.current = next;
      setEntries(next);
      pageRef.current = page;

      const reportedPages = data.pagination?.totalPages ?? totalPages;
      const reachedEnd = normalized.length < limit || page >= reportedPages;
      setHasMore(!reachedEnd);
      setPagination((prev) => ({
        ...prev,
        currentPage: page,
        totalPages: reachedEnd ? page : reportedPages,
      }));
    } catch (error) {
      if (!isRequestAbortError(error)) {
        toast.error("Error", error.message || "Failed to load more");
      }
    } finally {
      appendLockRef.current = false;
      setIsLoadingMore(false);
    }
  }, [uid, limit, isLoading, toast, entriesRef]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return undefined;
    const observer = new IntersectionObserver(
      (observed) => {
        if (observed.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: "280px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, entries.length]);

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

      const current = entriesRef.current || [];
      const firstPage = cache.entries || [];
      const seen = new Set(firstPage.map((item) => String(item._id)));
      const next =
        pageRef.current <= 1
          ? firstPage
          : [
              ...firstPage,
              ...current.filter((entry) => !seen.has(String(entry._id))),
            ];
      entriesRef.current = next;
      setEntries(next);
      if (cache.pagination && pageRef.current <= 1) {
        setPagination(cache.pagination);
        setHasMore((cache.pagination.totalPages ?? 1) > 1);
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
    dropIfPresent(pid);
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
          <Container maxW="container.xl" className="text-center z-0 relative">
            <VStack
              spacing={8}
              className={
                isCapacitorNative ? "pt-4" : "pt-[6.5rem] md:pt-28"
              }
            >
              <FeedPullToRefresh
                onRefresh={refreshHomeFeed}
                isRefreshing={isRefreshing}
                disabled={!uid}
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

              {uid && isLoading && !isRefreshing ? (
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
                    spacing={{ base: 6, md: 8 }}
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
                  {hasMore ? (
                    <Box ref={sentinelRef} w="full" py={4} aria-hidden>
                      {isLoadingMore ? (
                        <LoadingIndicator variant="inline" chakraColor={spinnerColor} />
                      ) : null}
                    </Box>
                  ) : null}
                  {entries.length === 0 && (
                    <VStack spacing={3} py={8} px={4}>
                      <Text fontSize="lg" fontWeight="semibold">
                        No workouts yet
                      </Text>
                      <Text
                        fontSize="sm"
                        color="gray.500"
                        maxW="280px"
                        textAlign="center"
                      >
                        Log one and it will show up here and on Progress.
                      </Text>
                      <Button
                        as={Link}
                        to="/create"
                        borderRadius="full"
                        h="48px"
                        px={6}
                        mt={1}
                      >
                        Log a workout
                      </Button>
                    </VStack>
                  )}
                </>
              )}
              </FeedPullToRefresh>
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
