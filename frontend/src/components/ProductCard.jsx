import { DeleteIcon, EditIcon, StarIcon } from "@chakra-ui/icons";
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
} from "@chakra-ui/react";
import { FileUploader } from "./FileUploader";
import { useProductStore } from "../store/product";
import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { auth } from "../firebase"; // Import Firebase auth
import axios from "axios"; // Import axios for API calls

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
          return;
        }

        const response = await axios.get(
          `http://localhost:5001/api/profile-image/${
            entry.ownerId || entry.uid
          }`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        // console.log("API Response:", response.data);

        // Check if the response has the expected structure
        if (response.data?.success && response.data?.data?.profileImage) {
          setProfileImage(response.data.data.profileImage);
        } else {
          console.log("No profile image found in response, using fallback");
          setProfileImage("https://cataas.com/cat");
        }
      } catch (error) {
        console.error("Error fetching profile image:", error);
        setProfileImage("https://cataas.com/cat");
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
  }, [profileImage]);

  const handleFileUpload = (file) => {
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
      if (data && data.data) {
        const { name, description, likes, comments } = data.data;
        setUpdatedEntry((prevEntry) => ({
          ...prevEntry,
          name,
          description,
          likes,
          comments,
        }));
        onUpdate(pid, data.data);
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
    const { success, message } = await likeEntry(pid);
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
        likes: prevEntry.likes + 1,
      }));
      toast({
        title: "Success",
        description: "Entry liked successfully",
        status: "success",
        duration: 5000,
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
      <Image
        src={profileImage}
        alt="User Profile"
        boxSize="40px"
        borderRadius="full"
        objectFit="cover"
        position="absolute"
        top="2.5"
        left="2.5"
        border="2px solid white"
        shadow="md"
        onError={(e) => {
          e.target.src = "https://cataas.com/cat";
        }}
      />
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
        <HStack
          style={{
            display: "flex",
            padding: "0px 12px 0px 12px",
            justifyContent: isOwner ? "space-between" : "flex-start",
            width: "100%",
          }}
        >
          <IconButton
            onClick={() => handleLikeEntry(entry._id)}
            icon={<StarIcon />}
            colorScheme="purple"
            style={{ width: "40px", height: "33px" }}
          />
          {isOwner && (
            <>
              <IconButton
                onClick={onOpen}
                icon={<EditIcon />}
                style={{ width: "235px", height: "55px" }}
                bg={useColorModeValue("gray.300", "gray.900")}
                color={"white"}
                rounded={"md"}
                _hover={{
                  boxShadow: "lg",
                }}
              />
              <IconButton
                onClick={onDeleteOpen}
                icon={<DeleteIcon />}
                colorScheme="red"
                bg={useColorModeValue("red.200", "red.800")}
                style={{ width: "40px", height: "29px" }}
              />
            </>
          )}
        </HStack>
        <HStack spacing={2}>
          <Input
            placeholder="Comment here.."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button
            style={{ bottom: "8px" }}
            colorScheme="gray"
            onClick={() => handleCommentEntry(entry._id, comment)}
            mt={4}
          >
            Comment
          </Button>
        </HStack>
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
    likes: PropTypes.number,
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
