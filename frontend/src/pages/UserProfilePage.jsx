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
  const { userId } = useParams();
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
    followers: 0,
    following: 0,
    isPrivate: false,
  });
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
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
      const userData = profileData.data.user;

      setUserProfile({
        name: userData.name || "Anonymous",
        username: userData.username || userData.name || "Anonymous",
        goal: userData.goal || "Not set",
        gymName: userData.gymName || "Not specified",
        postsCount: profileData.data.postsCount || 0,
        bio: userData.bio || "No bio available",
        profileImage: userData.picture || profileColorMode,
        backgroundPicture: userData.backgroundPicture || bgColorMode,
        followers: Array.isArray(userData.followers)
          ? userData.followers.length
          : 0, // Count of followers
        following: Array.isArray(userData.following)
          ? userData.following.length
          : 0, // Count of following
        isPrivate: userData.isPrivate || false,
      });

      // Check if current user is following this profile
      if (user && user.uid !== userId) {
        const isFollowingResponse = await fetch(
          `http://localhost:5001/api/isFollowing/${userId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!isFollowingResponse.ok) {
          throw new Error("Failed to check follow status");
        }

        const isFollowingData = await isFollowingResponse.json();
        setIsFollowing(isFollowingData.isFollowing || false);
        setIsFollowingLoadingInitial(false);
      } else {
        setIsFollowing(false);
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
      if (error.message === "User not authenticated") {
        navigate("/login");
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId, currentPage, limit, toast, profileColorMode, navigate]);

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (isMounted) {
        if (user) {
          fetchUserProfile();
        } else {
          setIsLoading(false);
          toast({
            title: "Authentication Required",
            description: "Please sign in to view this profile",
            status: "warning",
            duration: 5000,
            isClosable: true,
          });
          navigate("/login");
        }
        setIsAuthLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [fetchUserProfile, navigate, toast]);

  const handleFollow = async () => {
    try {
      setIsFollowingLoading(true);
      const user = auth.currentUser;
      if (!user) throw new Error("You need to sign in to follow users");

      const token = await user.getIdToken();
      const endpoint = isFollowing ? "unfollow" : "follow";

      const response = await fetch(
        `http://localhost:5001/api/${endpoint}/${userId}`,
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
        throw new Error(errorData.message || `Failed to ${endpoint} user`);
      }

      const data = await response.json();
      if (data.message === "Followed successfully") {
        setIsFollowing(true);
        setUserProfile((prev) => ({
          ...prev,
          followers: prev.followers + 1,
        }));
        toast({
          title: "Success",
          description: `You are now following ${userProfile.name}`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      } else if (data.message === "Already following") {
        setIsFollowing(true);
        toast({
          title: "Info",
          description: `You are already following ${userProfile.name}`,
          status: "info",
          duration: 5000,
          isClosable: true,
        });
      } else if (data.message === "Unfollowed successfully") {
        setIsFollowing(false);
        setUserProfile((prev) => ({
          ...prev,
          followers: prev.followers - 1,
        }));
        toast({
          title: "Success",
          description: `You have unfollowed ${userProfile.name}`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      } else if (data.message === "Not following") {
        setIsFollowing(false);
        toast({
          title: "Info",
          description: `You are not following ${userProfile.name}`,
          status: "info",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error(
        `Error ${isFollowing ? "unfollowing" : "following"} user:`,
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

  // Always render profile information, even for private profiles
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
              <Text fontWeight={600}>{userProfile.followers}</Text>
              <Text fontSize={"sm"} color={"gray.500"}>
                Followers
              </Text>
            </Stack>
            <Stack spacing={0} align={"center"}>
              <Text fontWeight={600}>{userProfile.following}</Text>
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
          {auth.currentUser?.uid !== userId && (
            <Stack direction={"row"} spacing={4} mt={6}>
              <Button
                onClick={handleFollow}
                colorScheme={isFollowing ? "whiteAlpha" : "blue"}
                w={"full"}
                isLoading={isFollowingLoading}
                isDisabled={isFollowingLoadingInitial}
                loadingText={isFollowing ? "Unfollowing..." : "Following..."}
              >
                {isFollowingLoadingInitial
                  ? "Loading..."
                  : isFollowing
                  ? "Following"
                  : "Follow"}
              </Button>
            </Stack>
          )}
        </Box>
      </Box>
    </Center>
  );

  // Render posts section only if profile is not private or viewer is a follower/owner
  const renderPosts = () => (
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
            color={useColorModeValue("gray.700", "gray.400")}
          />
        </Box>
      ) : entries.length > 0 ? (
        <>
          <SimpleGrid
            columns={{ base: 1, md: 2, lg: 3 }}
            spacing={10}
            w={"full"}
          >
            {entries.map((entry) => (
              <ProductCard key={entry._id} entry={entry} />
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
              isDisabled={currentPage === 1}
              mr={2}
            >
              <SlArrowLeft />
            </Button>
            <Text mx={2}>
              {currentPage} • {totalPages}
            </Text>
            <Button
              onClick={() => handlePageChange(currentPage + 1)}
              isDisabled={currentPage === totalPages || totalPages === 0}
              ml={2}
            >
              <SlArrowRight />
            </Button>
          </Box>
        </>
      ) : (
        <Text>No posts available.</Text>
      )}
    </VStack>
  );

  return (
    <Container maxW="container.xl" py={12}>
      {renderProfile()}
      {userProfile.isPrivate &&
      !isFollowing &&
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
              This profile's posts are private. Follow to view their workout
              posts.
            </Text>
            {auth.currentUser && (
              <Button
                onClick={handleFollow}
                colorScheme="blue"
                isLoading={isFollowingLoading}
                isDisabled={isFollowingLoadingInitial}
                loadingText="Following..."
              >
                {isFollowingLoadingInitial ? "Loading..." : "Follow"}
              </Button>
            )}
          </Box>
        </Center>
      ) : (
        renderPosts()
      )}
    </Container>
  );
};

export default UserProfilePage;
