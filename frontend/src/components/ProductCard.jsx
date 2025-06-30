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
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { FileUploader } from "./FileUploader";
import { useProductStore } from "../store/product";
import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { auth } from "../firebase"; // Import Firebase auth
import { API_ENDPOINTS, apiClient } from "../config/api"; // Import API configuration

const ProductCard = ({ entry, isOwner: propIsOwner, onUpdate }) => {
  const currentUser = auth.currentUser;
  const isOwner =
    propIsOwner ?? currentUser?.uid === (entry.ownerId || entry.uid);
  const [updatedEntry, setUpdatedEntry] = useState({
    _id: entry._id || "",
    name: entry.name || "Untitled",
    description: entry.description || "No description",
    image: entry.image || "https://cataas.com/cat", // Fallback for entry image
    likes: entry.likes || 0,
    comments: Array.isArray(entry.comments) ? entry.comments : [],
    createdAt: entry.createdAt || new Date().toISOString(),
  });
  const [profileImage, setProfileImage] = useState(
    "https://cataas.com/cat" // Valid fallback image
  );
  const [userDisplayName, setUserDisplayName] = useState("");
  const [isUsername, setIsUsername] = useState(false);
  const [isLiked, setIsLiked] = useState(false); // Track if current user has liked this post

  const [comment, setComment] = useState("");

  const textColorTitle = useColorModeValue("gray.600", "gray.500");
  const textColor = useColorModeValue("gray.200", "gray.200");
  const textColorDesc = useColorModeValue("gray.700", "gray.400");
  const textColorOne = useColorModeValue("gray.300", "gray.700");
  const bg = useColorModeValue("white", "gray.800");
  const { colorMode } = useColorMode();
  const { deleteEntry, updateEntry, likeEntry, commentEntry } =
    useProductStore();

  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();

  // Fetch profile image from MongoDB based on UID
  useEffect(() => {
    const fetchProfileImage = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          console.log("No auth token available");
          setProfileImage("https://cataas.com/cat");
          setUserDisplayName("Unknown User");
          return;
        }

        const response = await apiClient.get(
          API_ENDPOINTS.PROFILE_IMAGE(entry.ownerId || entry.uid)
        );

        // Check if the response has the expected structure
        if (response.data?.success && response.data?.data) {
          if (response.data.data.profileImage) {
            setProfileImage(response.data.data.profileImage);
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
          setProfileImage("https://cataas.com/cat");
          setUserDisplayName("Unknown User");
        }
      } catch (error) {
        console.error("Error fetching profile image:", error);
        setProfileImage("https://cataas.com/cat");
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

    if (entry.ownerId || entry.uid) {
      fetchProfileImage();
    }
  }, [entry.ownerId, entry.uid, toast]);

  useEffect(() => {
    // console.log("Updated profileImage:", profileImage);
    // console.log("Updated userDisplayName:", userDisplayName);
  }, [profileImage, userDisplayName]);

  // Check if current user has liked this post
  useEffect(() => {
    if (currentUser && entry.likes && Array.isArray(entry.likes)) {
      const userLiked = entry.likes.some(
        (likeId) => likeId === currentUser.uid
      );
      setIsLiked(userLiked);
    }
  }, [currentUser, entry.likes]);

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
    const { success, message, liked, likes } = await likeEntry(pid);
    if (!success) {
      toast({
        title: "Error",
        description: message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } else {
      setIsLiked(liked);
      setUpdatedEntry((prevEntry) => ({
        ...prevEntry,
        likes: likes,
      }));
      toast({
        title: "Success",
        description: message,
        status: "success",
        duration: 2000,
        isClosable: true,
      });
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
      <Image
        src={updatedEntry.image || entry.image}
        alt={entry.name}
        h={48}
        w="full"
        objectFit="cover"
        onError={(e) => {
          e.target.src = "https://cataas.com/cat";
        }}
      />
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
        <Image
          src={profileImage}
          alt="User Profile"
          boxSize="32px"
          borderRadius="full"
          objectFit="cover"
          border="2px solid white"
          onError={(e) => {
            e.target.src = "https://cataas.com/cat";
          }}
        />
        <Text
          fontSize="sm"
          fontWeight="medium"
          color={textColorTitle}
          fontFamily="Arial, sans-serif"
          maxW="120px"
          noOfLines={1}
        >
          <Link to={`/user/${entry.ownerId || entry.uid}`}>
            <Text _hover={{ textDecoration: "underline" }} cursor="pointer">
              {isUsername ? `@${userDisplayName}` : userDisplayName}
            </Text>
          </Link>
        </Text>
      </HStack>
      <VStack className="px-8" spacing={4} p="8px 8px 8px 8px">
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
        <Text color={textColorOne} fontFamily="Arial, sans-serif">
          Likes: {updatedEntry.likes}
        </Text>

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

        {/* Comments Display */}
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
    ]),
    comments: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string.isRequired,
        createdAt: PropTypes.string.isRequired,
      })
    ),
    createdAt: PropTypes.string,
    ownerId: PropTypes.string,
  }).isRequired,
  isOwner: PropTypes.bool,
  onUpdate: PropTypes.func.isRequired,
};

export default ProductCard;
