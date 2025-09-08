import {
  Container,
  SimpleGrid,
  Text,
  VStack,
  Button,
  Box,
  Spinner,
  useColorModeValue,
  useToast,
  Skeleton,
  SkeletonText,
} from "@chakra-ui/react";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useProductStore } from "../store/product";
import ProductCard from "../components/ProductCard";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup } from "firebase/auth";
import { Hero } from "../components/Hero";
import { SlArrowRight, SlArrowLeft } from "react-icons/sl";
import { API_ENDPOINTS, apiClient } from "../config/api";
import PaginationComponent from "../components/Pagination";

// Optimized feed loading with lazy loading and caching
const HomePage = () => {
  const { clearEntrys, updateEntry } = useProductStore();
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
  const [allPosts, setAllPosts] = useState([]);
  const [followingUids, setFollowingUids] = useState([]);
  const [profileCache, setProfileCache] = useState(new Map()); // Cache for profile images
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const toast = useToast();
  const spinnerColor = useColorModeValue("gray.700", "gray.400");

  // Performance optimization refs
  const resizeTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  // Memoized function to handle page change
  const handlePageChange = useCallback(
    (newPage) => {
      if (newPage >= 1 && newPage <= pagination.totalPages) {
        setCurrentPage(newPage);
      }
    },
    [pagination.totalPages, currentPage]
  );

  // Reset to page 1 when following list changes
  useEffect(() => {
    setCurrentPage(1);
  }, [followingUids]);

  // Optimized auth state handler
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsSignedIn(true);
        setUid(user.uid);
        useProductStore.getState().setCurrentUser(user);
      } else {
        setIsSignedIn(false);
        setUid(null);
        setEntries([]);
        setFollowingUids([]);
        setProfileCache(new Map());
        clearEntrys();
        useProductStore.getState().setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [clearEntrys]);

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
          setFollowingUids(uids.length > 0 ? uids : []);

          // Pre-cache profile images for followed users
          const uidsToCache = [...new Set([uid, ...uids])];
          await preloadProfileImages(uidsToCache);

          if (uids.length === 0) {
            toast({
              title: "No followed users",
              description: "Follow users to see their posts in your feed.",
              status: "info",
              duration: 5000,
              isClosable: true,
            });
          }
        } else {
          throw new Error(data.message || "Failed to fetch following");
        }
      } catch (error) {
        console.error("Error fetching following UIDs:", error);
        setFollowingUids([]);
        toast({
          title: "Error",
          description: error.message || "Failed to load followed users",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    };

    if (uid) {
      fetchFollowing();
    }
  }, [uid, toast]);

  // Preload profile images to reduce individual API calls
  const preloadProfileImages = useCallback(
    async (uids) => {
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
        console.error("Error preloading profile images:", error);
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
              console.warn(`Failed to fetch profile for ${uid}:`, error);
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

  // Optimized feed posts fetch with better error handling
  // Fetch all posts when following list changes
  useEffect(() => {
    const fetchAllPosts = async () => {
      try {
        setIsLoading(true);
        if (!uid || followingUids === null) {
          setEntries([]);
          setAllPosts([]);
          setPagination({
            currentPage: 1,
            totalPages: 0,
            totalPosts: 0,
            limit,
          });
          return;
        }

        const uidsToFetch = [...new Set([uid, ...followingUids])];

        // Fetch all posts from all users (no pagination limits)
        const fetchPromises = uidsToFetch.map(async (fetchUid) => {
          try {
            const response = await apiClient.get(
              API_ENDPOINTS.POSTS(fetchUid, 1, 100) // Get more posts to ensure we have all data
            );
            const data = response.data;

            if (data.success && Array.isArray(data.data)) {
              return data.data.map((post) => ({
                _id: post._id,
                name: post.name || "Untitled",
                description: post.description || "No description",
                image: post.image || null,
                likes: Array.isArray(post.likes) ? post.likes : [],
                comments: Array.isArray(post.comments) ? post.comments : [],
                createdAt: post.createdAt || new Date().toISOString(),
                ownerId: post.uid || fetchUid,
                uid: post.uid || fetchUid,
              }));
            }
            return [];
          } catch (error) {
            console.warn(`Error fetching posts for UID ${fetchUid}:`, error);
            return [];
          }
        });

        const results = await Promise.allSettled(fetchPromises);
        let fetchedPosts = [];

        results.forEach((result) => {
          if (result.status === "fulfilled") {
            fetchedPosts = [...fetchedPosts, ...result.value];
          }
        });

        // Remove duplicates and sort
        const sortedPosts = [
          ...new Map(fetchedPosts.map((post) => [post._id, post])).values(),
        ];
        sortedPosts.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        // Store all posts and calculate total pages
        setAllPosts(sortedPosts);
        const totalPages = Math.ceil(sortedPosts.length / limit) || 1;

        setPagination((prev) => ({
          ...prev,
          totalPages,
          totalPosts: sortedPosts.length,
        }));

        if (sortedPosts.length === 0) {
          toast({
            title: "Empty feed",
            description:
              "No posts available. Create or follow users to see more.",
            status: "info",
            duration: 5000,
            isClosable: true,
          });
        }
      } catch (error) {
        console.error("Error fetching feed posts:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to load feed",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
        setIsInitialLoad(false);
      }
    };

    if (uid && followingUids.length >= 0) {
      fetchAllPosts();
    }
  }, [uid, followingUids, limit, toast]);

  // Apply pagination when currentPage or allPosts changes
  useEffect(() => {
    if (allPosts.length > 0) {
      const startIndex = (currentPage - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedPosts = allPosts.slice(startIndex, endIndex);
      setEntries(paginatedPosts);
    } else {
      setEntries([]);
    }
  }, [currentPage, allPosts, limit]);

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

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      const response = await apiClient.post(API_ENDPOINTS.PROTECTED);

      const userData = response.data;
      const currentUserResponse = await apiClient.get(
        API_ENDPOINTS.GET_CURRENT_USER
      );

      const currentUserData = currentUserResponse.data;
    } catch (error) {
      console.error("Error during sign-in:", error);
      handleSignOutUser();
      toast({
        title: "Error",
        description: error.message || "Failed to sign in",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSignOutUser = async () => {
    try {
      await auth.signOut();
      setUid(null);
      setIsSignedIn(false);
      setEntries([]);
      setFollowingUids([]);
    } catch (error) {
      console.error("Error during sign-out:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to sign out",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

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
                        auth.currentUser?.uid === (entry.ownerId || entry.uid)
                      }
                      onUpdate={handleUpdateEntry}
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
    </Container>
  );
};

export default HomePage;
