import {
  Container,
  SimpleGrid,
  Text,
  VStack,
  Box,
  Spinner,
  useColorModeValue,
  Flex,
  HStack,
} from "@chakra-ui/react";
import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { useProductStore } from "../store/product";
import { supabase } from "../supabase/supabase";
import { Hero } from "../components/Hero";
import { HomeLandingSections } from "../components/HomeLandingSections";
import { API_ENDPOINTS, apiClient } from "../config/api";
import PaginationComponent from "../components/Pagination";
import ClaimedWorkoutsModal from "../components/ClaimedWorkoutsModal";
import { useCustomToast } from "../hooks/useCustomToast";
import { getCurrentAuthUser } from "../utils/auth";
import { cn } from "../lib/utils";
import { useTheme } from "../contexts/ThemeContext";
import ProductPreviewSection from "../components/ProductPreviewSection";
import { FiPlus } from "react-icons/fi";
import { isCapacitorNative as getIsCapacitorNative } from "../utils/isNativePlatform";
import WorkoutHabitWidgetPreview from "../components/WorkoutHabitWidgetPreview";

const isCapacitorNative = getIsCapacitorNative();
const ProductCard = lazy(() => import("../components/ProductCard"));

const HomePage = () => {
  const {
    clearEntrys,
    homeFeedCache,
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
  const [limit] = useState(6);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalPosts: 0,
    limit: 6,
  });
  const [profileCache, setProfileCache] = useState(new Map());
  const toast = useCustomToast();
  const spinnerColor = useColorModeValue("gray.700", "gray.400");
  const { currentTheme, setTheme } = useTheme();
  const prevThemeRef = useRef(null);
  const forcedLightRef = useRef(false);
  const navigate = useNavigate();

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Home page (signed-out): force light page content while keeping dark navbar.
  // Once the user is signed in, stop forcing and restore their previous theme.
  useEffect(() => {
    // Web waits for auth before touching theme; native guest shell can render first.
    if (!isAuthReady && !isCapacitorNative) return;

    if (!isSignedIn) {
      if (!forcedLightRef.current) {
        prevThemeRef.current = currentTheme;
        forcedLightRef.current = true;
      }

      if (currentTheme !== "light") setTheme("light");
      return;
    }

    if (forcedLightRef.current) {
      forcedLightRef.current = false;
      const prev = prevThemeRef.current;
      if (prev && prev !== "light") setTheme(prev);
    }
  }, [isAuthReady, isSignedIn, currentTheme, setTheme]);

  useEffect(() => {
    return () => {
      if (forcedLightRef.current) {
        forcedLightRef.current = false;
        const prev = prevThemeRef.current;
        if (prev && prev !== "light") setTheme(prev);
      }
    };
  }, [setTheme]);

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
        // Restore cached pages instantly; stale pages can refresh in the background.
        const cachedForPage =
          homeFeedCache &&
          homeFeedCache.uid === uid &&
          homeFeedCache.page === currentPage &&
          homeFeedCache.limit === limit;

        if (cachedForPage) {
          setEntries(homeFeedCache.entries || []);
          setPagination(
            homeFeedCache.pagination || {
              currentPage,
              totalPages: 1,
              totalPosts: homeFeedCache.entries?.length || 0,
              limit,
            }
          );
          setIsLoading(false);
          if (Date.now() - homeFeedCache.cachedAt < feedCacheTtlMs) {
            return;
          }
        }

        if (!cachedForPage) {
          setIsLoading(true);
        }
        const includeCount = currentPage === 1 || pagination.totalPosts === 0;
        const response = await apiClient.get(
          API_ENDPOINTS.HOME_FEED(currentPage, limit, includeCount)
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
          authorProfile: post.authorProfile || null,
          trainerProfile: post.trainerProfile || null,
        }));

        setEntries(normalized);

        const p = data.pagination;
        if (p) {
          setPagination({
            currentPage: p.currentPage ?? currentPage,
            totalPages: p.totalPages ?? pagination.totalPages,
            totalPosts: p.totalPosts ?? pagination.totalPosts,
            limit: p.limit ?? limit,
          });
        }

        setHomeFeedCache({
          uid,
          page: currentPage,
          limit,
          entries: normalized,
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
        setEntries([]);
        toast.error("Error", error.message || "Failed to load feed");
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomeFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast from useCustomToast is not referentially stable
  }, [uid, currentPage, limit, homeFeedCache, setHomeFeedCache, feedCacheTtlMs]);

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
          <Spinner
            size="lg"
            thickness="4px"
            speed="1.2s"
            color={spinnerColor}
          />
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
              />

              {uid && isLoading ? (
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
                  <Suspense
                    fallback={
                      <Box display="flex" justifyContent="center" py={8}>
                        <Spinner
                          size="lg"
                          thickness="4px"
                          speed="1.2s"
                          color={spinnerColor}
                        />
                      </Box>
                    }
                  >
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
                          priority={index < 3}
                          isOwner={
                            uid === (entry.ownerId || entry.uid)
                          }
                          onUpdate={handleUpdateEntry}
                          onDelete={handleDeleteEntry}
                          profileCache={profileCache}
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
        <>
          <Hero appGuestMarketing={isCapacitorNative} />
          <ProductPreviewSection />
          <div
            className={cn(
              "w-full min-w-0 bg-gradient-to-br from-zinc-200/75 via-zinc-50 to-white",
            )}
          >
            <Container maxW="container.xl" className="text-center z-0 relative">
              <HomeLandingSections />
            </Container>
            <footer className="border-t border-slate-200/80 bg-white/80 py-6">
              <Container maxW="container.xl">
                <div className="flex flex-col items-center justify-between gap-3 text-sm text-slate-700 sm:flex-row">
                  <p>Copyright 2026 Ethereal Gains. All rights reserved.</p>
                  <div className="flex items-center gap-4">
                    <Link
                      to="/privacy-policy"
                      className="font-medium text-slate-900 hover:underline"
                    >
                      Privacy Policy
                    </Link>
                    <Link
                      to="/terms-of-service"
                      className="font-medium text-slate-900 hover:underline"
                    >
                      Terms of Service
                    </Link>
                  </div>
                </div>
              </Container>
            </footer>
          </div>
        </>
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
