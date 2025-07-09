import { DeleteIcon, EditIcon, StarIcon } from "@chakra-ui/icons";
import { HamburgerIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  Heading,
  HStack,
  IconButton,
  Image,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  Textarea,
  useColorModeValue,
  useDisclosure,
  useToast,
  VStack,
  useColorMode,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Skeleton,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { FileUploader } from "./FileUploader";
import { useProductStore } from "../store/product";
import { useState, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { auth } from "../firebase"; // Import Firebase auth
import { API_ENDPOINTS, apiClient } from "../config/api"; // Import API configuration
import light from "../assets/light.jpg";
import night from "../assets/night.jpg";
import {
  parseWorkoutDescription,
  parseWorkoutTitle,
} from "../utils/workoutParser.js";

// Convert Vite asset imports to actual URLs
const lightUrl = new URL("../assets/light.jpg", import.meta.url).href;
const nightUrl = new URL("../assets/night.jpg", import.meta.url).href;

const ProductCard = ({
  entry,
  isOwner: propIsOwner,
  onUpdate,
  profileCache,
}) => {
  const currentUser = auth.currentUser;
  const isOwner = propIsOwner ?? currentUser?.uid === entry.uid;
  const { colorMode } = useColorMode();

  const [updatedEntry, setUpdatedEntry] = useState({
    _id: entry._id || "",
    name: entry.name || "Untitled",
    description: entry.description || "No description",
    image:
      entry.image ||
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-family='Arial, sans-serif' font-size='16'%3ENo Image%3C/text%3E%3C/svg%3E", // Fallback for entry image
    likes: Array.isArray(entry.likes) ? entry.likes : [],
    comments: Array.isArray(entry.comments) ? entry.comments : [],
    createdAt: entry.createdAt || new Date().toISOString(),
  });

  // Use profile cache if available, otherwise use defaults
  const cachedProfile = useMemo(() => {
    if (profileCache && profileCache.has(entry.uid)) {
      return profileCache.get(entry.uid);
    }
    return null;
  }, [profileCache, entry.uid]);

  const [profileImage, setProfileImage] = useState(
    cachedProfile?.profileImage || (colorMode === "dark" ? nightUrl : lightUrl)
  );
  const [userDisplayName, setUserDisplayName] = useState(
    cachedProfile?.displayName || "Unknown User"
  );
  const [isUsername, setIsUsername] = useState(
    cachedProfile?.isUsername || false
  );
  const [isLiked, setIsLiked] = useState(false); // Track if current user has liked this post
  const [imageLoaded, setImageLoaded] = useState(false);
  const [profileImageLoaded, setProfileImageLoaded] = useState(false);

  const [comment, setComment] = useState("");

  const textColorTitle = useColorModeValue("gray.600", "gray.500");
  const textColor = useColorModeValue("gray.200", "gray.200");
  const textColorDesc = useColorModeValue("gray.700", "gray.400");
  const textColorOne = useColorModeValue("gray.300", "gray.700");
  const bg = useColorModeValue("white", "gray.800");
  const { deleteEntry, updateEntry, likeEntry, commentEntry } =
    useProductStore();
  const currentUserInfo = useProductStore((state) => state.currentUserInfo);

  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();

  // Update profile data when cache changes
  useEffect(() => {
    if (cachedProfile) {
      setProfileImage(
        cachedProfile.profileImage ||
          (colorMode === "dark" ? nightUrl : lightUrl)
      );
      setUserDisplayName(cachedProfile.displayName || "Unknown User");
      setIsUsername(cachedProfile.isUsername || false);
    }
  }, [cachedProfile, colorMode]);

  // Fetch profile image only if not in cache
  useEffect(() => {
    const fetchProfileImage = async () => {
      // If we have cached data, use it
      if (cachedProfile) {
        return;
      }

      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          console.log("No auth token available");
          setProfileImage(colorMode === "dark" ? nightUrl : lightUrl);
          setUserDisplayName("Unknown User");
          return;
        }

        const response = await apiClient.get(
          API_ENDPOINTS.PROFILE_IMAGE(entry.uid)
        );

        // Check if the response has the expected structure
        if (response.data?.success && response.data?.data) {
          if (response.data.data.picture) {
            setProfileImage(response.data.data.picture);
          }
          // Set display name: username if available, otherwise name, otherwise fallback
          const displayName =
            response.data.data.username ||
            response.data.data.name ||
            "Unknown User";
          const isUsernameValue = !!response.data.data.username;
          setUserDisplayName(displayName);
          setIsUsername(isUsernameValue);
        } else {
          console.log("No profile data found in response, using fallback");
          setProfileImage(colorMode === "dark" ? nightUrl : lightUrl);
          setUserDisplayName("Unknown User");
        }
      } catch (error) {
        console.error("Error fetching profile image:", error);
        setProfileImage(colorMode === "dark" ? nightUrl : lightUrl);
        setUserDisplayName("Unknown User");
        toast({
          title: "Error",
          description: "Failed to load profile image.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    };

    if (entry.uid && !cachedProfile) {
      fetchProfileImage();
    }
  }, [entry.uid, toast, cachedProfile, colorMode]);

  // Update profile image when color mode changes
  useEffect(() => {
    // If no custom profile image is set, update to the appropriate default
    if (
      !profileImage ||
      profileImage === "https://cataas.com/cat" ||
      profileImage ===
        "https://coffective.com/wp-content/uploads/2018/06/default-featured-image.png.jpg"
    ) {
      setProfileImage(colorMode === "dark" ? nightUrl : lightUrl);
    }
  }, [colorMode, profileImage]);

  // Check if current user has liked this post
  useEffect(() => {
    if (currentUser && Array.isArray(updatedEntry.likes)) {
      const userLiked = updatedEntry.likes.some(
        (user) => user && user.uid === currentUser.uid
      );
      setIsLiked(userLiked);
    }
  }, [currentUser, updatedEntry.likes]);

  // Optimized image loading handlers
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleProfileImageLoad = useCallback(() => {
    setProfileImageLoaded(true);
  }, []);

  const handleImageError = useCallback((e) => {
    // Use a simple data URL for fallback instead of external image
    e.target.src =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-family='Arial, sans-serif' font-size='16'%3ENo Image%3C/text%3E%3C/svg%3E";
    setImageLoaded(true);
  }, []);

  const handleProfileImageError = useCallback(
    (e) => {
      e.target.src = colorMode === "dark" ? nightUrl : lightUrl;
      setProfileImageLoaded(true);
    },
    [colorMode]
  );

  // Reset image loading states when entry changes
  useEffect(() => {
    setImageLoaded(false);
    setProfileImageLoaded(false);
  }, [entry._id, entry.image, entry.uid]);

  // Check if image is already loaded (for cached images)
  useEffect(() => {
    if (updatedEntry.image) {
      // Use a simple timeout approach instead of Image constructor
      const timeout = setTimeout(() => {
        setImageLoaded(true);
      }, 100); // Short timeout for cached images

      return () => clearTimeout(timeout);
    }
  }, [updatedEntry.image]);

  // Timeout fallback for profile images
  useEffect(() => {
    if (profileImage) {
      const timeout = setTimeout(() => {
        setProfileImageLoaded(true);
      }, 3000); // 3 second timeout for profile images

      return () => clearTimeout(timeout);
    }
  }, [profileImage]);

  const handleFileUpload = (file) => {
    // Check file size (limit to 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      toast({
        title: "Error",
        description: "File too large. Please select an image smaller than 5MB.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    // Check file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Please select a valid image file (JPEG, PNG, or GIF).",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setUpdatedEntry({
        ...updatedEntry,
        image: reader.result,
        imageName: file.name,
      });
    };
    if (file) {
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteEntry = async (pid) => {
    const { success, message } = await deleteEntry(pid);
    if (!success) {
      toast({
        title: "Error",
        description: message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } else {
      toast({
        title: "Success",
        description: message,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      onDeleteClose();
    }
  };

  const handleUpdateEntry = async (pid, updatedEntry) => {
    const previousEntry = { ...updatedEntry };
    setUpdatedEntry((prevEntry) => ({ ...prevEntry, ...updatedEntry }));
    const { success, message, data } = await updateEntry(pid, updatedEntry);

    onClose();
    if (!success) {
      setUpdatedEntry(previousEntry);
      toast({
        title: "Error",
        description: message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } else {
      if (data) {
        const { name, description, likes, comments } = data;
        setUpdatedEntry((prevEntry) => ({
          ...prevEntry,
          name,
          description,
          likes,
          comments,
        }));
        onUpdate(pid, data);
      }
      toast({
        title: "Success",
        description: "Entry updated successfully",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleLikeEntry = async (pid) => {
    // Save previous state for rollback
    const prevIsLiked = isLiked;
    const prevLikes = Array.isArray(updatedEntry.likes)
      ? [...updatedEntry.likes]
      : [];

    // Optimistically update
    let newLikes;
    if (!isLiked) {
      // Like: add current user
      newLikes = [
        ...prevLikes,
        currentUserInfo && {
          _id: currentUserInfo._id,
          uid: currentUserInfo.uid,
          name: currentUserInfo.name,
          username: currentUserInfo.username,
          picture: currentUserInfo.picture,
        },
      ].filter(Boolean);
    } else {
      // Unlike: remove current user
      newLikes = prevLikes.filter(
        (user) => user && user.uid !== currentUserInfo?.uid
      );
    }
    setIsLiked(!isLiked);
    setUpdatedEntry((prevEntry) => ({
      ...prevEntry,
      likes: newLikes,
    }));

    // Make API call
    try {
      const { success, message, liked, likes } = await likeEntry(pid);
      if (!success) {
        // Rollback on error
        setIsLiked(prevIsLiked);
        setUpdatedEntry((prevEntry) => ({
          ...prevEntry,
          likes: prevLikes,
        }));
        toast({ title: "Error", description: message, status: "error" });
      } else if (Array.isArray(likes)) {
        // Update with server response for consistency
        setUpdatedEntry((prevEntry) => ({
          ...prevEntry,
          likes: likes,
        }));
      }
    } catch (error) {
      // Rollback on error
      setIsLiked(prevIsLiked);
      setUpdatedEntry((prevEntry) => ({
        ...prevEntry,
        likes: prevLikes,
      }));
      toast({ title: "Error", description: error.message, status: "error" });
    }
  };

  const handleCommentEntry = async (pid, comment) => {
    const { success, message } = await commentEntry(pid, comment);
    if (!success) {
      toast({
        title: "Error",
        description: message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } else {
      setUpdatedEntry((prevEntry) => ({
        ...prevEntry,
        comments: [
          ...prevEntry.comments,
          { text: comment, createdAt: new Date() },
        ],
      }));
      setComment("");
      toast({
        title: "Success",
        description: "Comment added successfully",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleProcessWorkout = async () => {
    try {
      // Check if this looks like a workout post
      const exercises = parseWorkoutDescription(updatedEntry.description);
      const { split } = parseWorkoutTitle(updatedEntry.name);

      if (exercises.length === 0) {
        toast({
          title: "Not a workout post",
          description:
            "This post doesn't contain workout data in the expected format.",
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      const response = await apiClient.post(
        API_ENDPOINTS.PROCESS_WORKOUT(entry._id)
      );

      if (response.data.success) {
        toast({
          title: "Success",
          description: `Workout data processed! Found ${exercises.length} exercises.`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error processing workout:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to process workout data",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const isOlderThanYear = now.getFullYear() - date.getFullYear() > 0;

    const options = {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    };

    if (isOlderThanYear) {
      options.year = "numeric";
    }

    return date.toLocaleString("en-US", options);
  };

  const formatDateHour = (dateString) => {
    const date = new Date(dateString);
    const options = {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    };
    return date.toLocaleString("en-US", options);
  };

  const formatDateTitleTime = (dateString) => {
    const date = new Date(dateString);
    const options = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };
    return date.toLocaleString("en-US", options);
  };

  return (
    <Box
      shadow="lg"
      rounded="lg"
      overflow="hidden"
      transition="all 0.3s"
      _hover={{ transform: "translateY(-5px)", shadow: "xl" }}
      bg={bg}
      position="relative"
    >
      <Box position="relative" h={48} w="full">
        {!imageLoaded && (
          <Skeleton
            h={48}
            w="full"
            startColor={useColorModeValue("gray.200", "gray.600")}
            endColor={useColorModeValue("gray.300", "gray.500")}
          />
        )}
        <Image
          src={updatedEntry.image || entry.image}
          alt={entry.name}
          h={48}
          w="full"
          objectFit="cover"
          onError={handleImageError}
          onLoad={handleImageLoad}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            display: imageLoaded ? "block" : "none",
            opacity: imageLoaded ? 1 : 0,
            transition: "opacity 0.3s ease-in-out",
          }}
          loading="lazy"
        />
      </Box>
      <HStack
        position="absolute"
        top="2.5"
        left="2.5"
        spacing={2}
        bg="rgba(255, 255, 255, 0.9)"
        px={2}
        py={1}
        borderRadius="full"
        shadow="md"
      >
        <Box position="relative" boxSize="32px">
          {!profileImageLoaded && (
            <Skeleton
              boxSize="32px"
              borderRadius="full"
              startColor={useColorModeValue("gray.200", "gray.600")}
              endColor={useColorModeValue("gray.300", "gray.500")}
            />
          )}
          <Image
            src={profileImage}
            alt="User Profile"
            boxSize="32px"
            borderRadius="full"
            objectFit="cover"
            border="2px solid white"
            onError={handleProfileImageError}
            onLoad={handleProfileImageLoad}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              display: profileImageLoaded ? "block" : "none",
              opacity: profileImageLoaded ? 1 : 0,
              transition: "opacity 0.3s ease-in-out",
            }}
            loading="lazy"
          />
        </Box>
        <Link to={isOwner ? "/profile" : `/user/${entry.uid}`}>
          <Text
            fontSize="sm"
            fontWeight="medium"
            color={textColorTitle}
            fontFamily="Arial, sans-serif"
            maxW="120px"
            noOfLines={1}
            _hover={{ textDecoration: "underline" }}
            cursor="pointer"
          >
            {isUsername ? `@${userDisplayName}` : userDisplayName}
          </Text>
        </Link>
      </HStack>
      <Box
        className="px-8"
        p="8px 8px 8px 8px"
        display="flex"
        flexDirection="column"
        minHeight="300px"
      >
        {/* Content area */}
        <VStack spacing={4} flex="1">
          <HStack w="full" justify="center" align="center">
            <Heading
              as={"h2"}
              size={"lg"}
              color={textColorTitle}
              fontFamily="Arial, sans-serif"
            >
              {updatedEntry.name}
            </Heading>
          </HStack>
          <Text color={textColorOne} fontFamily="Arial, sans-serif">
            {formatDateHour(updatedEntry.createdAt)}
            {" - "}
            {formatDateTitleTime(updatedEntry.createdAt)}
          </Text>
          <Box>
            <Box
              as="pre"
              style={{
                width: "100%",
                whiteSpace: "pre-wrap",
                fontFamily: "Arial, sans-serif",
              }}
              color={textColorDesc}
            >
              {updatedEntry.description}
            </Box>
          </Box>
          {/* <Text color={textColorOne} fontFamily="Arial, sans-serif">
            Likes:{" "}
            {Array.isArray(updatedEntry.likes) ? updatedEntry.likes.length : 0}
          </Text> */}
          {Array.isArray(updatedEntry.likes) &&
            updatedEntry.likes.length > 0 && (
              <Box w="full" mt={1} mb={2}>
                <Box
                  fontSize="sm"
                  color={textColorDesc}
                  fontFamily="Arial, sans-serif"
                >
                  Liked by{" "}
                  {updatedEntry.likes.map((user, idx) => (
                    <span key={user.uid || user._id}>
                      <Link
                        to={
                          user.uid === currentUser?.uid
                            ? "/profile"
                            : `/user/${user.uid}`
                        }
                      >
                        {user.username
                          ? `@${user.username}`
                          : user.name || "User"}
                      </Link>
                      {idx < updatedEntry.likes.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </Box>
              </Box>
            )}

          {/* Comments Display */}
          {Array.isArray(updatedEntry.comments) &&
            updatedEntry.comments.length > 0 && (
              <VStack
                style={{
                  maxWidth: "360px",
                  width: "-webkit-fill-available",
                  padding: "0px 1em 0px 1em",
                }}
                spacing={2}
                align="start"
              >
                {updatedEntry.comments.map((comment, index) => (
                  <Box
                    style={{
                      width: "100%",
                      display: "inline-flex",
                      justifyContent: "space-between",
                    }}
                    key={index}
                    p={2}
                    bg={colorMode === "dark" ? "gray.700" : "gray.100"}
                    rounded="md"
                  >
                    <Text color={textColor} fontFamily="Arial, sans-serif">
                      {comment.text}
                    </Text>
                    <Text
                      color={colorMode === "dark" ? "gray.300" : "black"}
                      fontSize="sm"
                      fontFamily="Arial, sans-serif"
                    >
                      {formatDate(comment.createdAt)}
                    </Text>
                  </Box>
                ))}
              </VStack>
            )}
        </VStack>

        {/* Bottom section with buttons and comment box - falls to bottom */}
        <VStack spacing={3} mt="auto" pt={4}>
          {/* Comment Section - Only show for owner */}
          {isOwner && (
            <HStack spacing={2} w="full">
              <Input
                placeholder="Comment here.."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <Button
                colorScheme="gray"
                onClick={() => handleCommentEntry(entry._id, comment)}
                px={4}
                py={2}
              >
                Comment
              </Button>
            </HStack>
          )}

          {/* Action Buttons - Restructured layout */}
          {isOwner ? (
            // Owner view: Favorite icon, edit button, and delete menu all in one row
            <HStack w="full" justify="space-between" spacing={1} pt={1} pb={0}>
              <IconButton
                onClick={() => handleLikeEntry(entry._id)}
                icon={<StarIcon />}
                bg={
                  isLiked
                    ? useColorModeValue("yellow.400", "yellow.500")
                    : useColorModeValue("", "gray.800")
                }
                color={isLiked ? "white" : "inherit"}
                boxShadow={useColorModeValue("lg", "lg")}
                size="md"
                rounded="lg"
                _hover={{
                  boxShadow: "lg",
                  bg: isLiked
                    ? useColorModeValue("yellow.500", "yellow.600")
                    : useColorModeValue("gray.100", "gray.700"),
                }}
              />
              <IconButton
                onClick={onOpen}
                icon={<EditIcon />}
                bg={useColorModeValue("gray.200", "gray.800")}
                color={"white"}
                rounded="lg"
                size="md"
                flex={1}
                boxShadow={useColorModeValue("lg", "md")}
                _hover={{
                  boxShadow: "lg",
                  bg: useColorModeValue("gray.300", "gray.700"),
                }}
              />
              <Menu>
                <MenuButton
                  as={IconButton}
                  icon={<HamburgerIcon />}
                  variant="ghost"
                  size="md"
                  rounded="lg"
                  boxShadow={useColorModeValue("lg", "lg")}
                  _hover={{
                    bg: useColorModeValue("gray.100", "gray.700"),
                  }}
                />
                <MenuList>
                  <MenuItem
                    onClick={handleProcessWorkout}
                    color="blue.500"
                    _hover={{
                      bg: useColorModeValue("blue.50", "blue.900"),
                    }}
                  >
                    Process Workout Data
                  </MenuItem>
                  <MenuItem
                    icon={<DeleteIcon />}
                    onClick={onDeleteOpen}
                    color="red.500"
                    _hover={{
                      bg: useColorModeValue("red.50", "red.900"),
                    }}
                  >
                    Delete Post
                  </MenuItem>
                </MenuList>
              </Menu>
            </HStack>
          ) : (
            // Non-owner view: Favorite icon, comment input, and comment button in one row
            <HStack w="full" spacing={2} pt={1} pb={0}>
              <IconButton
                onClick={() => handleLikeEntry(entry._id)}
                icon={<StarIcon />}
                bg={
                  isLiked
                    ? useColorModeValue("yellow.400", "yellow.500")
                    : useColorModeValue("", "gray.800")
                }
                color={isLiked ? "white" : "inherit"}
                boxShadow={useColorModeValue("lg", "lg")}
                size="md"
                rounded="lg"
                _hover={{
                  boxShadow: "lg",
                  bg: isLiked
                    ? useColorModeValue("yellow.500", "yellow.600")
                    : useColorModeValue("gray.100", "gray.700"),
                }}
              />
              <Input
                placeholder="Comment here.."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                flex={1}
              />
              <Button
                colorScheme="gray"
                onClick={() => handleCommentEntry(entry._id, comment)}
                px={4}
                py={2}
              >
                Comment
              </Button>
            </HStack>
          )}
        </VStack>
      </Box>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontFamily="Arial, sans-serif">Update Entry</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Input
                placeholder="Entry Name"
                name="name"
                value={updatedEntry.name}
                onChange={(e) =>
                  setUpdatedEntry({ ...updatedEntry, name: e.target.value })
                }
                fontFamily="Arial, sans-serif"
              />
              <Textarea
                placeholder="Workout Split"
                style={{ height: "185px" }}
                name="description"
                value={updatedEntry.description}
                onChange={(e) =>
                  setUpdatedEntry({
                    ...updatedEntry,
                    description: e.target.value,
                  })
                }
                fontFamily="Arial, sans-serif"
              />
              <Image
                src={updatedEntry.image || "default-profile-picture-url"}
                alt="Profile Picture"
                boxSize="150px"
                objectFit="cover"
                borderRadius="3xl"
              />
              <FileUploader handleFile={handleFileUpload} />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={() => handleUpdateEntry(entry._id, updatedEntry)}
              fontFamily="Arial, sans-serif"
            >
              Update
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              fontFamily="Arial, sans-serif"
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Delete</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Are you sure you want to delete this entry?</Text>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="red"
              onClick={() => handleDeleteEntry(entry._id)}
            >
              Delete
            </Button>
            <Button variant="ghost" onClick={onDeleteClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

ProductCard.propTypes = {
  entry: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    image: PropTypes.string,
    likes: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.arrayOf(PropTypes.string),
      PropTypes.arrayOf(
        PropTypes.shape({
          uid: PropTypes.string,
          name: PropTypes.string,
          username: PropTypes.string,
          picture: PropTypes.string,
        })
      ),
    ]),
    comments: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string.isRequired,
        createdAt: PropTypes.string.isRequired,
      })
    ),
    createdAt: PropTypes.string,
    uid: PropTypes.string,
  }).isRequired,
  isOwner: PropTypes.bool,
  onUpdate: PropTypes.func.isRequired,
  profileCache: PropTypes.instanceOf(Map),
};

export default ProductCard;
