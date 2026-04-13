import {
  Container,
  SimpleGrid,
  Text,
  VStack,
  Box,
  Spinner,
  useColorModeValue,
} from "@chakra-ui/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useProductStore } from "../store/product";
import ProductCard from "../components/ProductCard";
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

const HomePage = () => {
  const { clearEntrys } = useProductStore();
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

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Home page (signed-out): force light page content while keeping dark navbar.
  // Once the user is signed in, stop forcing and restore their previous theme.
  useEffect(() => {
    if (!isAuthReady) return;

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
        setIsLoading(false);
      }
      setIsAuthReady(true);
      // When signed in, keep isLoading true until fetchHomeFeed finishes so we do not
      // flash a second loading state after auth (feed effect sets loading + completes).
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
          setIsLoading(true);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast from useCustomToast is not referentially stable
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast from useCustomToast is not referentially stable
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

  // No spinner while auth resolves — only the feed uses a spinner below.
  if (!isAuthReady) {
    return (
      <Container maxW="container.xl" className="text-center z-0 relative">
        <Box minH="50vh" pt="112px" aria-hidden />
      </Container>
    );
  }

  return (
    <>
      {isSignedIn ? (
        <Container maxW="container.xl" className="text-center z-0 relative">
          <VStack spacing={8} className="pt-[112px]">
            <Text
              fontSize={"22"}
              fontWeight={"bold"}
              bgGradient={"linear(to-r, blue.200, gray.500)"}
              bgClip={"text"}
              textAlign={"center"}
            >
              Workout Posts
            </Text>
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
                  {entries.map((entry) => (
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
      ) : (
        <>
          <Hero />
          <div
            className={cn(
              "w-full min-w-0 bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200/80",
            )}
          >
            <Container maxW="container.xl" className="text-center z-0 relative">
              <HomeLandingSections />
            </Container>
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
