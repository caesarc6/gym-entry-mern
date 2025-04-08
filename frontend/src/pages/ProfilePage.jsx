import { EditIcon } from "@chakra-ui/icons";
import {
  useDisclosure,
  useToast,
  Container,
  SimpleGrid,
  Text,
  VStack,
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  Input,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Textarea,
  useColorModeValue,
  Heading,
  Avatar,
  Center,
  Flex,
  Spinner,
} from "@chakra-ui/react";
import { Stack, Box, Image } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useProductStore } from "../store/product";
import ProductCard from "../components/ProductCard";
import { FileUploader } from "../components/FileUploader";
import light from "../assets/light.jpg";
import night from "../assets/night.jpg";
import { auth } from "../firebase";
import { getAuth } from "firebase/auth";
import { SlArrowRight, SlArrowLeft } from "react-icons/sl";

const ProfilePage = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState({
    name: "",
    goal: "",
    gymName: "",
    postsCount: 0,
    profileImage: "",
    backgroundPicture: "",
    bio: "",
    followers: 0, // Add followers count
    following: 0, // Add following count
  });
  const [profileImage, setProfileImage] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [uid, setUid] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(6);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalPosts: 0,
    limit: 6,
  });
  const [allUsers, setAllUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const textColorDesc = useColorModeValue("gray.700", "gray.400");
  const bgColor = useColorModeValue("white", "gray.800");
  const colorEditButton = useColorModeValue("gray.400", "gray.900");
  const profileColorMode = useColorModeValue(light, night);
  const {
    isOpen: isProfileOpen,
    onOpen: onProfileOpen,
    onClose: onProfileClose,
  } = useDisclosure();
  const {
    isOpen: isBackgroundOpen,
    onOpen: onBackgroundOpen,
    onClose: onBackgroundClose,
  } = useDisclosure();
  const toast = useToast();
  const { fetchEntrys, entrys, clearEntrys } = useProductStore();

  const [isFollowersOpen, setIsFollowersOpen] = useState(false);
  const [isFollowingOpen, setIsFollowingOpen] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUid(user.uid);
        setIsSignedIn(true);
        fetchUserProfile(user);
      } else {
        setUid(null);
        setIsSignedIn(false);
        setEntries([]);
        setUserProfile({
          name: "",
          goal: "",
          gymName: "",
          postsCount: 0,
          profileImage: "",
          backgroundPicture: "",
          bio: "",
        });
        clearEntrys();
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [clearEntrys]);

  const handleProfileImageUpload = (file) => {
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserProfile((prev) => ({
          ...prev,
          profileImage: reader.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackgroundImageUpload = (file) => {
    if (file) {
      setBackgroundImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserProfile((prev) => ({
          ...prev,
          backgroundPicture: reader.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchUserProfile = async (user) => {
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        // `https://gym-tracker-brown.vercel.app/api/getUserProfile/${user.uid}`,
        `http://localhost:5001/api/getUserProfile/${user.uid}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error(await response.text());

      const data = await response.json();
      // console.log(data);
      setUserProfile({
        name: data.data.user.name || "Anonymous",
        goal: data.data.user.goal || "Not set…",
        gymName: data.data.user.gymName || "Not specified",
        postsCount: data.data.postsCount || 0,
        // postsCount: data.postsCount || 0,
        bio: data.data.user.bio || "No bio available",
        profileImage: data.data.user.picture || profileColorMode,
        backgroundPicture:
          data.data.user.backgroundPicture ||
          "https://images.unsplash.com/photo-1612865547334-09cb8cb455da",
        followers: data.data.user.followers?.length || 0,
        following: data.data.user.following?.length || 0,
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      toast({
        title: "Error",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const auth = getAuth();
    const user = auth.currentUser;
    const token = await user.getIdToken();

    try {
      const profileFormData = new FormData();
      profileFormData.append("name", userProfile.name);
      profileFormData.append("goal", userProfile.goal);
      profileFormData.append("gymName", userProfile.gymName);
      profileFormData.append("bio", userProfile.bio);
      if (profileImage) {
        profileFormData.append("profileImage", profileImage);
        profileFormData.append("profileImageName", profileImage.name);
      }

      const profileResponse = await fetch(
        // "http://localhost:5001/api/updateUserProfile",
        "https://gym-tracker-brown.vercel.app/api/updateUserProfile",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: profileFormData,
        }
      );

      if (!profileResponse.ok) {
        const errorData = await profileResponse.json();
        throw new Error(errorData.message || "Failed to update profile");
      }

      const profileData = await profileResponse.json();
      setUserProfile((prev) => ({
        ...prev,
        ...profileData.data,
      }));

      toast({
        title: "Success",
        description: "Profile updated successfully",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      setProfileImage(null);
      onProfileClose();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleBackgroundSubmit = async (e) => {
    e.preventDefault();
    const auth = getAuth();
    const user = auth.currentUser;
    const token = await user.getIdToken();

    try {
      if (!backgroundImage) {
        throw new Error("No background image selected");
      }

      const backgroundFormData = new FormData();
      backgroundFormData.append("backgroundPicture", backgroundImage);
      backgroundFormData.append("backgroundPictureName", backgroundImage.name);

      const backgroundResponse = await fetch(
        // "http://localhost:5001/api/updateUserBackgroundPicture",
        "https://gym-tracker-brown.vercel.app/api/updateUserBackgroundPicture",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: backgroundFormData,
        }
      );

      if (!backgroundResponse.ok) {
        const errorData = await backgroundResponse.json();
        throw new Error(
          errorData.message || "Failed to update background picture"
        );
      }

      const backgroundData = await backgroundResponse.json();
      setUserProfile((prev) => ({
        ...prev,
        backgroundPicture: backgroundData.data.backgroundPicture,
      }));

      toast({
        title: "Success",
        description: "Background picture updated successfully",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      setBackgroundImage(null);
      onBackgroundClose();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to update background picture",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setIsLoading(true);
        if (!uid) return;

        const user = auth.currentUser;
        const token = await user.getIdToken();
        const response = await fetch(
          `https://gym-tracker-brown.vercel.app/api/posts/${uid}?page=${currentPage}&limit=${limit}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();
        if (data.success) {
          setEntries(data.data);
          setPagination(data.pagination);
        }
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (uid) fetchPosts();
  }, [uid, currentPage, limit]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const totalPages = pagination.totalPages;

  // Get followers list
  const getFollowers = async (userId) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");

      const token = await user.getIdToken();
      const response = await fetch(
        `http://localhost:5001/api/users/${userId}/followers`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`, // Your Firebase ID token
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch followers");
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error("Error fetching followers:", error);
      toast({
        title: "Error",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return [];
    }
  };

  // Get following list
  const getFollowing = async (userId) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");

      const token = await user.getIdToken();
      const response = await fetch(
        `http://localhost:5001/api/users/${userId}/following`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`, // Your Firebase ID token
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch following");

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error("Error fetching following:", error);
      toast({
        title: "Error",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return [];
    }
  };

  // Add these functions to your ProfilePage component
  const followUser = async (userIdToFollow) => {
    setIsFollowingLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");

      const token = await user.getIdToken();
      const response = await fetch(
        `http://localhost:5001/api/follow/${userIdToFollow}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to follow user");

      const data = await response.json();
      toast({
        title: "Success",
        description: `You are now following ${data.data.followedUser.name}`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });

      // Refresh the followers/following lists
      if (isFollowersOpen) {
        const followers = await getFollowers(uid);
        setFollowersList(followers);
      }
      if (isFollowingOpen) {
        const following = await getFollowing(uid);
        setFollowingList(following);
      }

      // Update the follower count in the profile
      fetchUserProfile(user);
      return true;
    } catch (error) {
      console.error("Error following user:", error);
      toast({
        title: "Error",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return false;
    }
  };

  const unfollowUser = async (userIdToUnfollow) => {
    setIsFollowingLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");

      const token = await user.getIdToken();
      const response = await fetch(
        `http://localhost:5001/api/unfollow/${userIdToUnfollow}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to unfollow user");

      const data = await response.json();
      toast({
        title: "Success",
        description: `You have unfollowed ${data.data.unfollowedUser.name}`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });

      // Refresh the followers/following lists
      if (isFollowersOpen) {
        const followers = await getFollowers(uid);
        setFollowersList(followers);
      }
      if (isFollowingOpen) {
        const following = await getFollowing(uid);
        setFollowingList(following);
      }

      // Update the follower count in the profile
      fetchUserProfile(user);
      return true;
    } catch (error) {
      console.error("Error unfollowing user:", error);
      toast({
        title: "Error",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return false;
    }
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");
      const token = await user.getIdToken();
      const response = await fetch(
        `http://localhost:5001/api/searchUsers?query=${encodeURIComponent(
          query
        )}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) throw new Error("Failed to search users");
      const data = await response.json();
      setSearchResults(data.data || []);
    } catch (error) {
      console.error("Error searching users:", error);
      toast({
        title: "Error",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

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
          {/* Container for the background image and button */}
          <Box position="relative">
            <Image
              h={"120px"}
              w={"full"}
              src={userProfile.backgroundPicture}
              objectFit="cover"
              alt="Background"
            />
            <Button
              onClick={onBackgroundOpen}
              size="sm" // Smaller size for a cleaner look
              colorScheme="blue"
              bg={colorEditButton}
              color={"white"}
              position="absolute"
              top={2} // Distance from the top
              right={2} // Distance from the right
              _hover={{
                transform: "translateY(-2px)",
                boxShadow: "lg",
              }}
            >
              Edit Background
            </Button>
          </Box>

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
              <Stack
                spacing={0}
                align={"center"}
                onClick={async () => {
                  const followers = await getFollowers(uid);
                  setFollowersList(followers);
                  setIsFollowersOpen(true);
                }}
                style={{ cursor: "pointer" }}
              >
                <Text fontWeight={600}>{userProfile.followers}</Text>
                <Text fontSize={"sm"} color={"gray.500"}>
                  Followers
                </Text>
              </Stack>

              <Stack
                spacing={0}
                align={"center"}
                onClick={async () => {
                  const following = await getFollowing(uid);
                  setFollowingList(following);
                  setIsFollowingOpen(true);
                }}
                style={{ cursor: "pointer" }}
              >
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
                onClick={onProfileOpen}
                colorScheme="blue"
                w={"full"}
                bg={colorEditButton}
                color={"white"}
                rounded={"md"}
                _hover={{
                  transform: "translateY(-2px)",
                  boxShadow: "lg",
                }}
              >
                Edit Profile
              </Button>
            </Stack>
          </Box>
        </Box>
      </Center>

      {/* Followers Modal */}
      <Modal isOpen={isFollowersOpen} onClose={() => setIsFollowersOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Followers</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {followersList.length === 0 ? (
              <Text>No followers yet</Text>
            ) : (
              <VStack align="start" spacing={4}>
                {followersList.map((user) => (
                  <Flex
                    key={user.uid}
                    align="center"
                    justify="space-between"
                    w="full"
                  >
                    <Flex align="center">
                      <Link to={`/user/${user.uid}`}>
                        <Avatar src={user.picture} size="sm" mr={2} />
                      </Link>
                      <Link to={`/user/${user.uid}`}>
                        <Text _hover={{ textDecoration: "underline" }}>
                          {user.name}
                        </Text>
                      </Link>
                    </Flex>
                    {user.uid !== uid && (
                      <Button
                        size="sm"
                        colorScheme="red"
                        variant="outline"
                        onClick={() => unfollowUser(user.uid)}
                        isLoading={isFollowingLoading}
                        loadingText="Unfollowing..."
                      >
                        Unfollow
                      </Button>
                    )}
                  </Flex>
                ))}
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Following Modal */}
      <Modal isOpen={isFollowingOpen} onClose={() => setIsFollowingOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Following</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {followingList.length === 0 ? (
              <Text>Not following anyone yet</Text>
            ) : (
              <VStack align="start" spacing={4}>
                {followingList.map((user) => (
                  <Flex
                    key={user.uid}
                    align="center"
                    justify="space-between"
                    w="full"
                  >
                    <Flex align="center">
                      <Link to={`/user/${user.uid}`}>
                        <Avatar src={user.picture} size="sm" mr={2} />
                      </Link>
                      <Link to={`/user/${user.uid}`}>
                        <Text _hover={{ textDecoration: "underline" }}>
                          {user.name}
                        </Text>
                      </Link>
                    </Flex>
                    {user.uid !== uid && (
                      <Button
                        size="sm"
                        colorScheme="red"
                        variant="outline"
                        onClick={() => unfollowUser(user.uid)}
                        isLoading={isFollowingLoading}
                        loadingText="Unfollowing..."
                      >
                        Unfollow
                      </Button>
                    )}
                  </Flex>
                ))}
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
      {/* Profile Edit Modal */}
      <Modal isOpen={isProfileOpen} onClose={onProfileClose}>
        <form onSubmit={handleProfileSubmit}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Update Profile</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <Image
                  src={userProfile.profileImage}
                  alt="Profile Picture"
                  boxSize="150px"
                  objectFit="cover"
                  borderRadius="full"
                />
                <FileUploader
                  handleFile={handleProfileImageUpload}
                  accept="image/jpeg,image/png,image/gif"
                />
                <Input
                  type="text"
                  name="name"
                  value={userProfile.name}
                  onChange={(e) =>
                    setUserProfile((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Name"
                />
                <Input
                  type="text"
                  name="goal"
                  value={userProfile.goal}
                  onChange={(e) =>
                    setUserProfile((prev) => ({
                      ...prev,
                      goal: e.target.value,
                    }))
                  }
                  placeholder="Fitness Goal"
                />
                <Textarea
                  name="bio"
                  value={userProfile.bio}
                  onChange={(e) =>
                    setUserProfile((prev) => ({ ...prev, bio: e.target.value }))
                  }
                  placeholder="Bio"
                />
                <select
                  value={userProfile.gymName}
                  onChange={(e) =>
                    setUserProfile((prev) => ({
                      ...prev,
                      gymName: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select a location</option>
                  <option value="Blink Fitness">Blink Fitness</option>
                  <option value="Planet Fitness">Planet Fitness</option>
                  <option value="Retro Fitness">Retro Fitness</option>
                  <option value="Home">Home</option>
                </select>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button type="submit" colorScheme="blue" mr={3}>
                Update
              </Button>
              <Button variant="ghost" onClick={onProfileClose}>
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </form>
      </Modal>

      {/* Background Edit Modal */}
      <Modal isOpen={isBackgroundOpen} onClose={onBackgroundClose}>
        <form onSubmit={handleBackgroundSubmit}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Update Background Picture</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <Image
                  src={userProfile.backgroundPicture}
                  alt="Background Picture"
                  boxSize="150px"
                  objectFit="cover"
                  borderRadius="full"
                />
                <FileUploader
                  handleFile={handleBackgroundImageUpload}
                  accept="image/jpeg,image/png,image/gif"
                />
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button type="submit" colorScheme="blue" mr={3}>
                Update
              </Button>
              <Button variant="ghost" onClick={onBackgroundClose}>
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </form>
      </Modal>
      <VStack spacing={4} mt={6} w="full" maxW="md" mx="auto">
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            searchUsers(e.target.value);
          }}
          size="lg"
        />
        {isSearching && <Spinner />}
        {searchResults.length > 0 && (
          <VStack
            align="start"
            spacing={2}
            w="full"
            bg={bgColor}
            p={4}
            borderRadius="md"
            boxShadow="md"
          >
            {searchResults.map((user) => (
              <Link
                key={user.uid}
                to={`/user/${user.uid}`}
                aria-label={`View ${user.name}'s profile`}
              >
                <Flex align="center" _hover={{ bg: "gray.100" }} p={2} w="full">
                  <Avatar src={user.picture} size="sm" mr={2} />
                  <Text>{user.name}</Text>
                </Flex>
              </Link>
            ))}
          </VStack>
        )}
        {searchQuery && !isSearching && searchResults.length === 0 && (
          <Text>No users found</Text>
        )}
      </VStack>
      <VStack spacing={8} mt={10}>
        <Text
          fontSize={"22"}
          fontWeight={"bold"}
          bgGradient={"linear(to-r, blue.200, gray.400)"}
          bgClip={"text"}
        >
          Workout Page
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

export default ProfilePage;
