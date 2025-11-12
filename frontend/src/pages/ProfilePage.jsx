import {
  Container,
  SimpleGrid,
  Text,
  VStack,
  Button,
  Box,
  Spinner,
  useToast,
  Heading,
  Avatar,
  Center,
  Flex,
  Stack,
  Image,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Input,
  Textarea,
  Badge,
  HStack,
} from "@chakra-ui/react";
import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useProductStore } from "../store/product";
import ProductCard from "../components/ProductCard";
import { FileUploader } from "../components/FileUploader";
import { auth } from "../firebase";
import { SlArrowRight, SlArrowLeft } from "react-icons/sl";
import light from "../assets/light.jpg";
import PaginationComponent from "../components/Pagination";
import night from "../assets/night.jpg";
import defaultBg from "../assets/defaultBg.jpg";
import defaultBgNight from "../assets/defaultBgNight.jpg";
import { useThemeColors } from "../hooks/useThemeColors";

// Convert Vite asset imports to actual URLs
const lightUrl = new URL("../assets/light.jpg", import.meta.url).href;
const nightUrl = new URL("../assets/night.jpg", import.meta.url).href;
const defaultBgUrl = new URL("../assets/defaultBg.jpg", import.meta.url).href;
const defaultBgNightUrl = new URL(
  "../assets/defaultBgNight.jpg",
  import.meta.url
).href;
import { useCustomToast } from "../hooks/useCustomToast";
import { API_ENDPOINTS, apiClient } from "../config/api";

const ProfilePage = () => {
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
  });
  const [profileImage, setProfileImage] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [isFollowersOpen, setIsFollowersOpen] = useState(false);
  const [isFollowingOpen, setIsFollowingOpen] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [followRequests, setFollowRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  const toast = useCustomToast();
  const colors = useThemeColors();
  const profileColorMode =
    colors.currentTheme === "light" ? lightUrl : nightUrl;
  const bgColorMode =
    colors.currentTheme === "light" ? defaultBgUrl : defaultBgNightUrl;

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

  const navigate = useNavigate();

  // Handle auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsSignedIn(true);
        setUid(user.uid);
        useProductStore.getState().setCurrentUser(user);
        fetchUserProfile(user);
        fetchUserPosts(user.uid);
      } else {
        setIsSignedIn(false);
        setUid(null);
        setEntries([]);
        setUserProfile({
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
        });
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch posts when page changes
  useEffect(() => {
    if (uid) {
      fetchUserPosts(uid, currentPage);
    }
  }, [currentPage, uid]);

  // Fetch follow requests
  const fetchFollowRequests = async () => {
    try {
      setIsLoadingRequests(true);
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");

      const response = await apiClient.get(
        API_ENDPOINTS.FOLLOW_REQUESTS_PENDING
      );

      const data = response.data;
      setFollowRequests(data.data || []);
    } catch (error) {
      console.error("Error fetching follow requests:", error);
      toast.error(
        "Failed to load requests",
        "Unable to fetch follow requests at this time."
      );
    } finally {
      setIsLoadingRequests(false);
    }
  };

  // Handle follow request actions
  const handleFollowRequestAction = async (requestId, action) => {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.FOLLOW_REQUEST_ACTION(requestId, action)
      );

      const data = response.data;

      // Remove the processed request from the list
      setFollowRequests((prev) =>
        prev.filter((request) => request._id !== requestId)
      );

      toast({
        title: "Success",
        description: `Request ${
          action === "accept" ? "accepted" : "rejected"
        } successfully`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      // Refresh user profile to update follower count
      if (uid) {
        fetchUserProfile(auth.currentUser);
      }
    } catch (error) {
      console.error("Error processing follow request:", error);
      toast({
        title: "Error",
        description: "Failed to process request",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Add useEffect to fetch follow requests when user is authenticated
  useEffect(() => {
    if (uid) {
      fetchFollowRequests();
    }
  }, [uid]);

  const fetchUserProfile = async (user) => {
    try {
      const response = await apiClient.get(
        API_ENDPOINTS.GET_USER_PROFILE(user.uid)
      );

      const data = response.data;

      setUserProfile({
        name: data.data.user.name || "Name",
        username: data.data.user.username || data.data.user.name || "Username",
        goal: data.data.user.goal || "Not set",
        gymName: data.data.user.gymName || "Not specified",
        postsCount: data.data.postsCount || 0,
        bio: data.data.user.bio || "No bio available",
        profileImage: data.data.user.picture || profileColorMode,
        backgroundPicture: data.data.user.backgroundPicture || bgColorMode,
        followersCount: data.data.followersCount || 0,
        followingCount: data.data.followingCount || 0,
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      toast.error(
        "Profile load failed",
        error.message || "Unable to load profile data."
      );
    }
  };

  const fetchUserPosts = async (userId, page = 1) => {
    try {
      const response = await apiClient.get(
        API_ENDPOINTS.POSTS(userId, page, limit)
      );

      const data = response.data;

      if (data.success) {
        const normalizedPosts = (data.data || []).map((post) => ({
          ...post,
          trainerUid: post.trainerUid || null,
          trainerName: post.trainerName || null,
          trainerUsername: post.trainerUsername || null,
        }));
        setEntries(normalizedPosts);
        setPagination(data.pagination);
      } else {
        console.error("Failed to fetch posts:", data.message);
        toast({
          title: "Error",
          description: data.message || "Failed to fetch posts",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error fetching user posts:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch posts",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePostUpdate = async (pid, updatedEntry) => {
    const previousEntries = [...entries];
    const updatedEntries = entries.map((entry) =>
      entry._id === pid ? { ...entry, ...updatedEntry } : entry
    );
    setEntries(updatedEntries);

    try {
      const { success, message, data } = await useProductStore
        .getState()
        .updateEntry(pid, updatedEntry);
      if (!success) {
        setEntries(previousEntries);
        console.error("Failed to update entry:", message);
        toast.error("Update failed", message || "Unable to update post.");
      } else {
        setEntries((prevEntries) =>
          prevEntries.map((entry) =>
            entry._id === pid ? { ...entry, ...data.data } : entry
          )
        );
      }
    } catch (error) {
      setEntries(previousEntries);
      console.error("Error updating entry:", error);
      toast.error("Update failed", error.message || "Unable to update post.");
    }
  };

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

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;

    // Basic validation
    if (!userProfile.name.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (userProfile.username && userProfile.username.includes(" ")) {
      toast({
        title: "Error",
        description: "Username cannot contain spaces",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      const profileFormData = new FormData();
      profileFormData.append("name", userProfile.name);
      profileFormData.append("username", userProfile.username);
      profileFormData.append("goal", userProfile.goal);
      profileFormData.append("gymName", userProfile.gymName);
      profileFormData.append("bio", userProfile.bio);
      if (profileImage) {
        profileFormData.append("profileImage", profileImage);
        profileFormData.append("profileImageName", profileImage.name);
      }

      const profileResponse = await apiClient.post(
        API_ENDPOINTS.UPDATE_USER_PROFILE,
        profileFormData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const profileData = profileResponse.data;
      setUserProfile((prev) => ({
        ...prev,
        ...profileData.data,
        profileImage:
          profileData.data.picture ||
          profileData.data.profileImage ||
          prev.profileImage,
      }));

      toast.success(
        "Profile updated",
        "Your profile has been successfully updated."
      );
      setProfileImage(null);
      onProfileClose();

      // Refresh profile data to ensure everything is in sync
      if (auth.currentUser) {
        fetchUserProfile(auth.currentUser);
        // Also update the global store with the new profile data
        try {
          const response = await apiClient.get(API_ENDPOINTS.GET_CURRENT_USER);
          if (response.data) {
            useProductStore.getState().setCurrentUserInfo(response.data);
          }
        } catch (error) {
          console.error("Error updating current user info:", error);
        }
      }
    } catch (error) {
      toast.error(
        "Update failed",
        error.message || "Unable to update profile."
      );
    }
  };

  const handleBackgroundSubmit = async (e) => {
    e.preventDefault();
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
        "http://localhost:5001/api/updateUserBackgroundPicture",
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

      toast.success(
        "Background updated",
        "Your background image has been successfully updated."
      );
      setBackgroundImage(null);
      onBackgroundClose();
    } catch (error) {
      toast.error(
        "Update failed",
        error.message || "Unable to update background image."
      );
    }
  };

  const getFollowers = async (userId) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");

      const response = await apiClient.get(
        API_ENDPOINTS.USERS_FOLLOWERS(userId)
      );
      const data = response.data;

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch followers");
      }

      // Add fallback for profile pictures
      const followersWithFallback = data.data.map((follower) => ({
        ...follower,
        picture: follower.picture || profileColorMode,
      }));

      return Array.isArray(followersWithFallback) ? followersWithFallback : [];
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

  const getFollowing = async (userId) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");

      const response = await apiClient.get(
        API_ENDPOINTS.USERS_FOLLOWING(userId)
      );
      const data = response.data;

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch following");
      }

      // Add fallback for profile pictures
      const followingWithFallback = data.data.map((following) => ({
        ...following,
        picture: following.picture || profileColorMode,
      }));

      return Array.isArray(followingWithFallback) ? followingWithFallback : [];
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

  if (!isSignedIn) {
    return (
      <Container maxW="container.xl" py={12}>
        <Center>
          <VStack spacing={6}>
            <Heading>Please Sign In</Heading>
            <Text>You need to be signed in to view your profile.</Text>
            <Link to="/">
              <Button colorScheme="blue">Go to Home</Button>
            </Link>
          </VStack>
        </Center>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={12}>
      {/* Profile Section */}
      <Center py={6} mt={10}>
        <Box
          maxW={"580px"}
          w={"full"}
          bg={colors.bgCard}
          boxShadow={"2xl"}
          rounded={"md"}
          overflow={"hidden"}
        >
          <Box position="relative">
            <Image
              h={"120px"}
              w={"full"}
              src={userProfile.backgroundPicture}
              fallbackSrc={bgColorMode}
              objectFit="cover"
              alt="Background"
            />
            <Button
              onClick={onBackgroundOpen}
              size="sm"
              colorScheme="blue"
              bg={colors.textMuted}
              color={"white"}
              position="absolute"
              top={2}
              right={2}
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
                {userProfile.username && `@${userProfile.username}`}
              </Heading>
              <Text fontSize={"lg"} color={colors.textSecondary}>
                {userProfile.name}
              </Text>
            </Stack>
            <Stack spacing={0} align={"center"} mb={4}>
              <Text color={colors.textMuted}>
                {userProfile.goal} | {userProfile.gymName}
              </Text>
            </Stack>
            <Stack spacing={0} align={"center"} mt={4}>
              <Text color={colors.textMuted} textAlign="center">
                {userProfile.bio}
              </Text>
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
                <Text fontWeight={600}>{userProfile.followersCount}</Text>
                <Text fontSize={"sm"} color={colors.textMuted}>
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
                <Text fontWeight={600}>{userProfile.followingCount}</Text>
                <Text fontSize={"sm"} color={colors.textMuted}>
                  Following
                </Text>
              </Stack>
              <Stack spacing={0} align={"center"}>
                <Text fontWeight={600}>{userProfile.postsCount || 0}</Text>
                <Text fontSize={"sm"} color={colors.textMuted}>
                  Posts
                </Text>
              </Stack>
            </Stack>
            <Stack direction={"row"} spacing={4} mt={6}>
              <Button
                onClick={onProfileOpen}
                colorScheme="blue"
                variant="outline"
                w={"full"}
              >
                Edit Profile
              </Button>
              <Button
                onClick={() => navigate("/privacy")}
                colorScheme="gray"
                variant="outline"
                w={"full"}
              >
                Privacy Settings
              </Button>
            </Stack>

            {/* Follow Requests Badge */}
            {followRequests.length > 0 && (
              <Box mt={4} textAlign="center">
                <Button
                  onClick={() => setIsFollowersOpen(true)}
                  colorScheme="blue"
                  size="sm"
                  leftIcon={
                    <Badge colorScheme="red" borderRadius="full" px={2}>
                      {followRequests.length}
                    </Badge>
                  }
                >
                  Follow Requests
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Center>

      {/* Posts Section */}
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
              color={colors.textSecondary}
            />
          </Box>
        ) : entries.length > 0 ? (
          <>
            <SimpleGrid
              columns={{ base: 1, md: 2, lg: 3 }}
              spacing={10}
              w={"full"}
              alignItems="center"
              justifyItems="center"
            >
              {entries.map((entry) => (
                <ProductCard
                  key={entry._id}
                  entry={entry}
                  isOwner={auth.currentUser?.uid === entry.uid}
                  onUpdate={handlePostUpdate}
                />
              ))}
            </SimpleGrid>
            <PaginationComponent
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
              maxVisiblePages={5}
            />
          </>
        ) : (
          <Text>No posts available.</Text>
        )}
      </VStack>

      {/* Followers Modal */}
      <Modal isOpen={isFollowersOpen} onClose={() => setIsFollowersOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Followers
            {followRequests.length > 0 && (
              <Badge colorScheme="red" ml={2}>
                {followRequests.length} pending requests
              </Badge>
            )}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {followRequests.length > 0 && (
              <Box mb={6}>
                <Heading size="sm" mb={3}>
                  Follow Requests
                </Heading>
                <VStack align="start" spacing={3}>
                  {followRequests.map((request) => (
                    <Flex
                      key={request._id}
                      align="center"
                      justify="space-between"
                      w="full"
                      p={3}
                      borderWidth={1}
                      borderRadius="md"
                      bg={colors.bgMuted}
                    >
                      <Flex align="center" flex={1}>
                        <Link to={`/user/${request.requester.uid}`}>
                          <Avatar
                            src={request.requester.picture}
                            size="sm"
                            mr={3}
                          />
                        </Link>
                        <Link to={`/user/${request.requester.uid}`}>
                          <Box flex={1}>
                            <Text
                              fontWeight="medium"
                              fontSize="md"
                              _hover={{ textDecoration: "underline" }}
                            >
                              {request.requester.name ||
                                request.requester.username}
                            </Text>
                            {request.requester.username &&
                              request.requester.name && (
                                <Text fontSize="sm" color={colors.textMuted}>
                                  @{request.requester.username}
                                </Text>
                              )}
                            {request.requester.bio && (
                              <Text
                                fontSize="xs"
                                color={colors.textMuted}
                                mt={1}
                                noOfLines={2}
                              >
                                {request.requester.bio}
                              </Text>
                            )}
                          </Box>
                        </Link>
                      </Flex>
                      <HStack spacing={2} ml={4}>
                        <Button
                          size="sm"
                          colorScheme="green"
                          onClick={() =>
                            handleFollowRequestAction(request._id, "accept")
                          }
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          colorScheme="red"
                          variant="outline"
                          onClick={() =>
                            handleFollowRequestAction(request._id, "reject")
                          }
                        >
                          Reject
                        </Button>
                      </HStack>
                    </Flex>
                  ))}
                </VStack>
              </Box>
            )}

            <Heading size="sm" mb={3}>
              Current Followers
            </Heading>
            {followersList.length === 0 ? (
              <Text>No followers yet</Text>
            ) : (
              <VStack align="start" spacing={4} pb={4}>
                {followersList.map((user) => (
                  <Flex
                    key={user.uid}
                    align="center"
                    justify="space-between"
                    w="full"
                    p={2}
                    borderRadius="md"
                    _hover={{ bg: colors.bgMuted }}
                  >
                    <Flex align="center" flex={1}>
                      <Link to={`/user/${user.uid}`}>
                        <Avatar src={user.picture} size="sm" mr={3} />
                      </Link>
                      <Link to={`/user/${user.uid}`}>
                        <Box>
                          <Text
                            fontWeight="medium"
                            _hover={{ textDecoration: "underline" }}
                          >
                            {user.name || user.username}
                          </Text>
                          {user.username && user.name && (
                            <Text fontSize="sm" color={colors.textMuted}>
                              @{user.username}
                            </Text>
                          )}
                          {user.bio && (
                            <Text
                              fontSize="xs"
                              color={colors.textMuted}
                              noOfLines={1}
                            >
                              {user.bio}
                            </Text>
                          )}
                        </Box>
                      </Link>
                    </Flex>
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
              <VStack align="start" spacing={4} pb={4}>
                {followingList.map((user) => (
                  <Flex
                    key={user.uid}
                    align="center"
                    justify="space-between"
                    w="full"
                    p={2}
                    borderRadius="md"
                    _hover={{ bg: colors.bgMuted }}
                  >
                    <Flex align="center" flex={1}>
                      <Link to={`/user/${user.uid}`}>
                        <Avatar src={user.picture} size="sm" mr={3} />
                      </Link>
                      <Link to={`/user/${user.uid}`}>
                        <Box>
                          <Text
                            fontWeight="medium"
                            _hover={{ textDecoration: "underline" }}
                          >
                            {user.name || user.username}
                          </Text>
                          {user.username && user.name && (
                            <Text fontSize="sm" color={colors.textMuted}>
                              @{user.username}
                            </Text>
                          )}
                          {user.bio && (
                            <Text
                              fontSize="xs"
                              color={colors.textMuted}
                              noOfLines={1}
                            >
                              {user.bio}
                            </Text>
                          )}
                        </Box>
                      </Link>
                    </Flex>
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
                  name="username"
                  value={userProfile.username}
                  onChange={(e) =>
                    setUserProfile((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  placeholder="Username"
                />
                <Text fontSize="xs" color={colors.textMuted} textAlign="center">
                  Username must be unique and cannot contain spaces
                </Text>
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
                <Input
                  type="text"
                  name="gymName"
                  value={userProfile.gymName}
                  onChange={(e) =>
                    setUserProfile((prev) => ({
                      ...prev,
                      gymName: e.target.value,
                    }))
                  }
                  placeholder="Gym Name"
                />
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button type="submit" colorScheme="blue" mr={3}>
                Save Changes
              </Button>
              <Button onClick={onProfileClose}>Cancel</Button>
            </ModalFooter>
          </ModalContent>
        </form>
      </Modal>

      {/* Background Edit Modal */}
      <Modal isOpen={isBackgroundOpen} onClose={onBackgroundClose}>
        <form onSubmit={handleBackgroundSubmit}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Update Background</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <Image
                  src={userProfile.backgroundPicture}
                  alt="Background Picture"
                  w="full"
                  h="200px"
                  objectFit="cover"
                  borderRadius="md"
                />
                <FileUploader
                  handleFile={handleBackgroundImageUpload}
                  accept="image/jpeg,image/png,image/gif"
                />
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button type="submit" colorScheme="blue" mr={3}>
                Save Changes
              </Button>
              <Button onClick={onBackgroundClose}>Cancel</Button>
            </ModalFooter>
          </ModalContent>
        </form>
      </Modal>
    </Container>
  );
};

export default ProfilePage;
