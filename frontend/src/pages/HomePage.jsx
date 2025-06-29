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
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useProductStore } from "../store/product";
import ProductCard from "../components/ProductCard";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup } from "firebase/auth";
import { Hero } from "../components/Hero";
import { SlArrowRight, SlArrowLeft } from "react-icons/sl";
import { API_ENDPOINTS, apiClient } from "../config/api";

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
  const [followingUids, setFollowingUids] = useState([]);
  const toast = useToast();
  const spinnerColor = useColorModeValue("gray.700", "gray.400");

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Handle auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsSignedIn(true);
        setUid(user.uid);
        // console.log("Current user UID:", user.uid); // Debug
        useProductStore.getState().setCurrentUser(user);
      } else {
        setIsSignedIn(false);
        setUid(null);
        setEntries([]);
        setFollowingUids([]);
        clearEntrys();
        useProductStore.getState().setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [clearEntrys]);

  // Fetch following UIDs
  useEffect(() => {
    const fetchFollowing = async () => {
      if (!uid) return;
      try {
        const user = auth.currentUser;
        const token = await user.getIdToken();
        const response = await apiClient.get(
          API_ENDPOINTS.USERS_FOLLOWING(uid)
        );

        const data = response.data;
        // console.log("Following API response:", data);
        if (data.success) {
          const uids = data.data.map((user) => user.uid);
          setFollowingUids(uids.length > 0 ? uids : []);
          // console.log("Following UIDs:", uids);
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

  // Fetch posts for following feed
  useEffect(() => {
    const fetchFeedPosts = async () => {
      try {
        setIsLoading(true);
        if (!uid || followingUids === null) {
          setEntries([]);
          setPagination({
            currentPage: 1,
            totalPages: 0,
            totalPosts: 0,
            limit,
          });
          return;
        }

        const user = auth.currentUser;
        const token = await user.getIdToken();
        let allPosts = [];
        let totalPosts = 0;
        const uidsToFetch = [...new Set([uid, ...followingUids])];
        // console.log("Fetching posts for UIDs:", uidsToFetch);

        // Calculate the number of posts needed for the current page
        const startIndex = (currentPage - 1) * limit;
        const endIndex = startIndex + limit;

        // Map to track pages fetched for each user
        const userPages = new Map(uidsToFetch.map((uid) => [uid, 1]));
        let postsNeeded = endIndex;

        // Fetch posts until we have enough or all users are exhausted
        while (postsNeeded > allPosts.length && userPages.size > 0) {
          for (const fetchUid of [...userPages.keys()]) {
            const userPage = userPages.get(fetchUid);
            try {
              const response = await apiClient.get(
                API_ENDPOINTS.POSTS(fetchUid, userPage, limit)
              );
              const data = response.data;
              // console.log(
              //   `Response for UID ${fetchUid} (page ${userPage}):`,
              //   data
              // );

              if (data.success && Array.isArray(data.data)) {
                const normalizedPosts = data.data.map((post) => ({
                  _id: post._id,
                  name: post.name || "Untitled",
                  description: post.description || "No description",
                  image: post.image || null,
                  likes: post.likes || 0,
                  comments: Array.isArray(post.comments) ? post.comments : [],
                  createdAt: post.createdAt || new Date().toISOString(),
                  ownerId: post.uid || fetchUid,
                  uid: post.uid || fetchUid,
                }));
                allPosts = [...allPosts, ...normalizedPosts];
                totalPosts += data.pagination.totalPosts || 0;

                // Update pagination for this user
                if (userPage >= (data.pagination.totalPages || 1)) {
                  userPages.delete(fetchUid); // No more posts for this user
                } else {
                  userPages.set(fetchUid, userPage + 1); // Fetch next page later
                }
              } else {
                console.warn(`No posts or error for UID ${fetchUid}:`, data);
                userPages.delete(fetchUid); // Stop fetching for this user
              }
            } catch (error) {
              console.error(`Error fetching posts for UID ${fetchUid}:`, error);
              userPages.delete(fetchUid); // Stop fetching for this user
            }
          }
        }

        // Remove duplicates by _id
        allPosts = [
          ...new Map(allPosts.map((post) => [post._id, post])).values(),
        ];

        // Sort by createdAt (newest first) and apply pagination
        allPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const paginatedPosts = allPosts.slice(startIndex, endIndex);
        const totalPages = Math.ceil(totalPosts / limit) || 1;

        // console.log("All normalized posts:", allPosts);
        // console.log("Paginated posts:", paginatedPosts);
        // console.log("Pagination state:", {
        //   currentPage,
        //   totalPages,
        //   totalPosts,
        //   limit,
        // });
        setEntries(paginatedPosts);
        setPagination({
          currentPage,
          totalPages,
          totalPosts,
          limit,
        });

        if (allPosts.length === 0) {
          console.log("No posts found for feed");
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
      }
    };

    if (uid) {
      fetchFeedPosts();
    }
  }, [uid, followingUids, currentPage, limit, toast]);

  const handleUpdateEntry = async (pid, updatedEntry) => {
    const previousEntries = [...entries];
    const updatedEntries = entries.map((entry) =>
      entry._id === pid ? { ...entry, ...updatedEntry } : entry
    );
    setEntries(updatedEntries);

    try {
      console.log("Updating entry:", pid, updatedEntry); // Debug
      const { success, message, data } = await updateEntry(pid, updatedEntry);
      if (!success) {
        setEntries(previousEntries);
        console.error("Failed to update entry:", message);
        toast({
          title: "Error",
          description: message || "Failed to update post",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } else {
        setEntries((prevEntries) =>
          prevEntries.map((entry) =>
            entry._id === pid ? { ...entry, ...data.data } : entry
          )
        );
        toast({
          title: "Success",
          description: "Post updated successfully",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      setEntries(previousEntries);
      console.error("Error updating entry:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update post",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      const response = await apiClient.post(API_ENDPOINTS.PROTECTED);

      const userData = response.data;
      console.log("User Data:", userData.uid);
      const currentUserResponse = await apiClient.get(
        API_ENDPOINTS.GET_CURRENT_USER
      );

      const currentUserData = currentUserResponse.data;
      console.log("Logged in as:", currentUserData);
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
      console.log("Signed out");
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
              Following Feed
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
                >
                  {entries.map((entry) => (
                    <ProductCard
                      key={entry._id}
                      entry={entry}
                      isOwner={
                        auth.currentUser?.uid === (entry.ownerId || entry.uid)
                      }
                      onUpdate={handleUpdateEntry}
                    />
                  ))}
                </SimpleGrid>
                <Box
                  mt={6}
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                >
                  <Button
                    onClick={() => handlePageChange(currentPage - 1)}
                    isDisabled={
                      currentPage === 1 || pagination.totalPages === 0
                    }
                    mr={2}
                  >
                    <SlArrowLeft />
                  </Button>
                  <Text mx={2}>
                    {pagination.totalPages === 0
                      ? "0 • 0"
                      : `${currentPage} • ${pagination.totalPages}`}
                  </Text>
                  <Button
                    onClick={() => {
                      handlePageChange(currentPage + 1);
                    }}
                    isDisabled={
                      currentPage === pagination.totalPages ||
                      pagination.totalPages === 0
                    }
                    ml={2}
                  >
                    <SlArrowRight />
                  </Button>
                </Box>
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
          <Hero />
        </div>
      )}
    </Container>
  );
};

export default HomePage;
