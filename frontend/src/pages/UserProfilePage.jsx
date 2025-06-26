import {
  useToast,
  Container,
  SimpleGrid,
  Text,
  VStack,
  Button,
  useColorModeValue,
  Heading,
  Avatar,
  Center,
  Flex,
  Spinner,
  Box,
} from "@chakra-ui/react";
import { Stack, Image } from "@chakra-ui/react";
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { SlArrowRight, SlArrowLeft } from "react-icons/sl";
import ProductCard from "../components/ProductCard";
import light from "../assets/light.jpg";
import night from "../assets/night.jpg";
import defaultBg from "../assets/defaultBg.jpg";
import defaultBgNight from "../assets/defaultBgNight.jpg";

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
  });
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [hasFollowRequest, setHasFollowRequest] = useState(false);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  const [isFollowingLoadingInitial, setIsFollowingLoadingInitial] =
    useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(6);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalPosts: 0,
    limit: 6,
  });

  const toast = useToast();
  const profileColorMode = useColorModeValue(light, night);
  const bgColorMode = useColorModeValue(defaultBg, defaultBgNight);
  const bgColor = useColorModeValue("white", "gray.800");

  // Determine userId: use paramUserId if available, otherwise use current user's UID
  const userId = paramUserId || auth.currentUser?.uid;

  // Check follow status and request status
  const checkFollowStatus = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user || user.uid === userId) return;

      const token = await user.getIdToken();
      const followStatusResponse = await fetch(
        `http://localhost:5001/api/follow-request/status/${userId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (followStatusResponse.ok) {
        const followStatusData = await followStatusResponse.json();
        setIsFollowing(followStatusData.isFollowing || false);
        setHasFollowRequest(followStatusData.hasRequest || false);
      }
    } catch (error) {
      console.error("Error checking follow status:", error);
    }
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
    try {
      setIsLoading(true);
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not authenticated");
      }

      const token = await user.getIdToken();

      // Fetch user profile data
      const profileResponse = await fetch(
        `http://localhost:5001/api/getUserProfile/${userId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!profileResponse.ok) throw new Error(await profileResponse.text());

      const profileData = await profileResponse.json();
      console.log("Profile response data:", profileData);

      const userData = profileData.data.user;
      console.log("User data from response:", userData);

      setUserProfile({
        name:
          userData.name || (userData.isPrivate ? "Private Profile" : "Name"),
        username:
          userData.username || (userData.isPrivate ? "Private" : "Username"),
        goal: userData.goal || (userData.isPrivate ? "Private" : "Not set"),
        gymName:
          userData.gymName ||
          (userData.isPrivate ? "Private" : "Not specified"),
        postsCount: profileData.data.postsCount || 0,
        bio:
          userData.bio ||
          (userData.isPrivate
            ? "This profile is private. Follow this user to see their content."
            : "No bio available"),
        profileImage: userData.picture || profileColorMode,
        backgroundPicture: userData.backgroundPicture || bgColorMode,
        followersCount: profileData.data.followersCount,
        followingCount: profileData.data.followingCount,
        isPrivate: userData.isPrivate || false,
      });

      // Check if current user is following this profile and follow request status
      if (user && user.uid !== userId) {
        const followStatusResponse = await fetch(
          `http://localhost:5001/api/follow-request/status/${userId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (followStatusResponse.ok) {
          const followStatusData = await followStatusResponse.json();
          setIsFollowing(followStatusData.isFollowing || false);
          setHasFollowRequest(followStatusData.hasRequest || false);
        }
        setIsFollowingLoadingInitial(false);
      } else {
        setIsFollowing(false);
        setHasFollowRequest(false);
        setIsFollowingLoadingInitial(false);
      }

      // Fetch user's posts
      const postsResponse = await fetch(
        `http://localhost:5001/api/posts/${userId}?page=${currentPage}&limit=${limit}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const postsData = await postsResponse.json();
      if (postsData.success) {
        // Normalize posts to match ProductCard expectations
        const normalizedEntries = postsData.data.map((post) => ({
          _id: post._id,
          name: post.name || "Untitled",
          description: post.description || "No description",
          image: post.image || null,
          likes: post.likes || 0,
          comments: Array.isArray(post.comments) ? post.comments : [],
          createdAt: post.createdAt || new Date().toISOString(),
          ownerId: post.uid || userId, // Add ownerId, assuming the post belongs to the profile user
        }));
        setEntries(normalizedEntries);
        setPagination(postsData.pagination);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load profile",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, currentPage, limit, toast, profileColorMode, bgColorMode]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsAuthLoading(false);
        fetchUserProfile();
      } else {
        setIsAuthLoading(false);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchUserProfile]);

  const handleFollow = async () => {
    try {
      setIsFollowingLoading(true);
      const user = auth.currentUser;
      if (!user) throw new Error("You need to sign in to follow users");

      const token = await user.getIdToken();

      if (isFollowing) {
        // Unfollow logic
        const response = await fetch(
          `http://localhost:5001/api/unfollow/${userId}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to unfollow user");
        }

        const data = await response.json();
        if (data.message === "Unfollowed successfully") {
          setIsFollowing(false);
          setHasFollowRequest(false);
          setUserProfile((prev) => ({
            ...prev,
            followersCount: prev.followersCount - 1,
          }));
          toast({
            title: "Success",
            description: `You have unfollowed ${userProfile.name}`,
            status: "success",
            duration: 5000,
            isClosable: true,
          });
        }
      } else if (hasFollowRequest) {
        // Cancel follow request
        const response = await fetch(
          `http://localhost:5001/api/follow-request/${userId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Failed to cancel follow request"
          );
        }

        const data = await response.json();
        if (data.success) {
          setHasFollowRequest(false);
          toast({
            title: "Follow Request Cancelled",
            description: `Follow request to ${userProfile.name} has been cancelled`,
            status: "info",
            duration: 5000,
            isClosable: true,
          });
        }
      } else {
        // Send follow request
        const response = await fetch(
          `http://localhost:5001/api/follow-request/${userId}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to send follow request");
        }

        const data = await response.json();

        if (data.isFollowing) {
          // Direct follow (public profile)
          setIsFollowing(true);
          setHasFollowRequest(false);
          setUserProfile((prev) => ({
            ...prev,
            followersCount: prev.followersCount + 1,
          }));
          toast({
            title: "Success",
            description: `You are now following ${userProfile.name}`,
            status: "success",
            duration: 5000,
            isClosable: true,
          });
        } else if (data.hasRequest) {
          // Follow request sent (private profile)
          setHasFollowRequest(true);
          toast({
            title: "Follow Request Sent",
            description: `Follow request sent to ${userProfile.name}`,
            status: "info",
            duration: 5000,
            isClosable: true,
          });
        }
      }
    } catch (error) {
      console.error(
        `Error ${
          isFollowing
            ? "unfollowing"
            : hasFollowRequest
            ? "cancelling follow request"
            : "following"
        } user:`,
        error
      );
      toast({
        title: "Error",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsFollowingLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const totalPages = pagination.totalPages;

  if (isAuthLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
        bg={useColorModeValue("gray.50", "gray.900")}
      >
        <Spinner
          size="lg"
          thickness="4px"
          speed="1.4s"
          color={useColorModeValue("gray.700", "gray.400")}
        />
      </Box>
    );
  }

  const handlePostUpdate = (postId, updatedPost) => {
    setEntries((prevEntries) =>
      prevEntries.map((entry) =>
        entry._id === postId ? { ...entry, ...updatedPost } : entry
      )
    );
  };

  const renderProfile = () => (
    <Center py={6} mt={10}>
      <Box
        maxW={"580px"}
        w={"full"}
        bg={bgColor}
        boxShadow={"2xl"}
        rounded={"md"}
        overflow={"hidden"}
      >
        <Image
          h={"120px"}
          w={"full"}
          src={userProfile.backgroundPicture}
          objectFit="cover"
          alt="Background"
        />
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
              @{userProfile.username}
            </Heading>
          </Stack>
          <Stack spacing={0} align={"center"} mb={4}>
            <Text color={"gray.500"}>
              {userProfile.goal} | {userProfile.gymName}
            </Text>
          </Stack>
          <Stack spacing={0} align={"center"} mt={4}>
            <Text color={"gray.500"}>{userProfile.bio}</Text>
          </Stack>
          <Stack direction={"row"} justify={"center"} spacing={6} mt={8}>
            <Stack spacing={0} align={"center"}>
              <Text fontWeight={600}>{userProfile.followersCount}</Text>
              <Text fontSize={"sm"} color={"gray.500"}>
                Followers
              </Text>
            </Stack>
            <Stack spacing={0} align={"center"}>
              <Text fontWeight={600}>{userProfile.followingCount}</Text>
              <Text fontSize={"sm"} color={"gray.500"}>
                Following
              </Text>
            </Stack>
            <Stack spacing={0} align={"center"}>
              <Text fontWeight={600}>{userProfile.postsCount || 0}</Text>
              <Text fontSize={"sm"} color={"gray.500"}>
                Posts
              </Text>
            </Stack>
          </Stack>
          <Stack direction={"row"} spacing={4} mt={6}>
            {auth.currentUser?.uid === userId ? (
              <Button
                onClick={() => navigate("/edit-profile")}
                colorScheme="blue"
                variant="outline"
                w={"full"}
              >
                Edit Profile
              </Button>
            ) : (
              <Button
                onClick={handleFollow}
                colorScheme={isFollowing ? "whiteAlpha" : "blue"}
                w={"full"}
                isLoading={isFollowingLoading}
                isDisabled={isFollowingLoadingInitial}
                loadingText={
                  isFollowing
                    ? "Unfollowing..."
                    : hasFollowRequest
                    ? "Canceling Request..."
                    : "Following..."
                }
              >
                {isFollowingLoadingInitial
                  ? "Loading..."
                  : isFollowing
                  ? "Following"
                  : hasFollowRequest
                  ? "Cancel Request"
                  : "Follow"}
              </Button>
            )}
          </Stack>
        </Box>
      </Box>
    </Center>
  );

  const renderPosts = () => (
    <Container maxW="container.xl" py={8}>
      {isLoading ? (
        <Center>
          <Spinner size="lg" />
        </Center>
      ) : entries.length === 0 ? (
        <Center>
          <Text fontSize="lg" color="gray.500">
            No posts yet
          </Text>
        </Center>
      ) : (
        <>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {entries.map((entry) => (
              <ProductCard
                key={entry._id}
                entry={entry}
                onUpdate={handlePostUpdate}
              />
            ))}
          </SimpleGrid>
          {totalPages > 1 && (
            <Flex justify="center" mt={8} gap={2}>
              <Button
                onClick={() => handlePageChange(currentPage - 1)}
                isDisabled={currentPage === 1}
                leftIcon={<SlArrowLeft />}
              >
                Previous
              </Button>
              <Text alignSelf="center" px={4}>
                Page {currentPage} of {totalPages}
              </Text>
              <Button
                onClick={() => handlePageChange(currentPage + 1)}
                isDisabled={currentPage === totalPages}
                rightIcon={<SlArrowRight />}
              >
                Next
              </Button>
            </Flex>
          )}
        </>
      )}
    </Container>
  );

  return (
    <Container maxW="container.xl" py={12}>
      {renderProfile()}
      {userProfile.isPrivate &&
      !isFollowing &&
      !hasFollowRequest &&
      auth.currentUser?.uid !== userId ? (
        <Center py={6}>
          <Box
            maxW={"580px"}
            w={"full"}
            bg={bgColor}
            boxShadow={"2xl"}
            rounded={"md"}
            p={6}
            textAlign="center"
          >
            <Text fontSize={"lg"} color={"gray.500"} mb={4}>
              This profile is private. Send a follow request to view their
              workout posts.
            </Text>
            {auth.currentUser && (
              <Button
                onClick={handleFollow}
                colorScheme="blue"
                isLoading={isFollowingLoading}
                isDisabled={isFollowingLoadingInitial}
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
            bg={bgColor}
            boxShadow={"2xl"}
            rounded={"md"}
            p={6}
            textAlign="center"
          >
            <Text fontSize={"lg"} color={"gray.500"} mb={4}>
              Follow request sent! You'll be able to see their posts once they
              accept your request.
            </Text>
            <Button
              onClick={handleFollow}
              colorScheme="whiteAlpha"
              variant="outline"
              isLoading={isFollowingLoading}
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
