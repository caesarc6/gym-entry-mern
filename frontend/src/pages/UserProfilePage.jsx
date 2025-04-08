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
} from "@chakra-ui/react";
import { Stack, Box, Image } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { auth } from "../firebase";
import { getAuth } from "firebase/auth";
import { SlArrowRight, SlArrowLeft } from "react-icons/sl";
import ProductCard from "../components/ProductCard";
import light from "../assets/light.jpg";
import night from "../assets/night.jpg";

const UserProfilePage = () => {
  const { userId } = useParams(); // Get userId from URL params
  const [userProfile, setUserProfile] = useState({
    name: "",
    goal: "",
    gymName: "",
    postsCount: 0,
    profileImage: "",
    backgroundPicture: "",
    bio: "",
    followers: 0,
    following: 0,
  });
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
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
  const bgColor = useColorModeValue("white", "gray.800");

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        const user = auth.currentUser;
        const token = await user?.getIdToken();

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
        setUserProfile({
          name: profileData.data.user.name || "Anonymous",
          goal: profileData.data.user.goal || "Not set…",
          gymName: profileData.data.user.gymName || "Not specified",
          postsCount: profileData.data.postsCount || 0,
          bio: profileData.data.user.bio || "No bio available",
          profileImage: profileData.data.user.picture || profileColorMode,
          backgroundPicture:
            profileData.data.user.backgroundPicture ||
            "https://images.unsplash.com/photo-1612865547334-09cb8cb455da",
          followers: profileData.data.user.followers?.length || 0,
          following: profileData.data.user.following?.length || 0,
        });

        // Check if current user is following this profile
        if (user) {
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
          if (isFollowingResponse.ok) {
            const isFollowingData = await isFollowingResponse.json();
            setIsFollowing(isFollowingData.isFollowing);
          }
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
          setEntries(postsData.data);
          setPagination(postsData.pagination);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        toast({
          title: "Error",
          description: error.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId, currentPage, limit]);

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

      if (!response.ok) throw new Error(`Failed to ${endpoint} user`);

      const data = await response.json();
      setIsFollowing(!isFollowing);

      // Update follower count
      setUserProfile((prev) => ({
        ...prev,
        followers: isFollowing ? prev.followers - 1 : prev.followers + 1,
      }));

      toast({
        title: "Success",
        description: isFollowing
          ? `You have unfollowed ${userProfile.name}`
          : `You are now following ${userProfile.name}`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
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

  return (
    <Container maxW="container.xl" py={12}>
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
                @{userProfile.name}
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
            <Stack direction={"row"} spacing={4} mt={6}>
              <Button
                onClick={handleFollow}
                colorScheme={isFollowing ? "red" : "blue"}
                w={"full"}
                isLoading={isFollowingLoading}
                loadingText={isFollowing ? "Unfollowing..." : "Following..."}
              >
                {isFollowing ? "Unfollow" : "Follow"}
              </Button>
            </Stack>
          </Box>
        </Box>
      </Center>

      <VStack spacing={8} mt={10}>
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
            <Spinner size="xl" />
          </Box>
        ) : (
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
                isDisabled={currentPage === totalPages}
                ml={2}
              >
                <SlArrowRight />
              </Button>
            </Box>
          </>
        )}
      </VStack>
    </Container>
  );
};

export default UserProfilePage;
