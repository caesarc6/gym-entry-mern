import { DeleteIcon, EditIcon, StarIcon, ChatIcon } from "@chakra-ui/icons";
import { HamburgerIcon } from "@chakra-ui/icons";
import { FiShare2 } from "react-icons/fi";
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
  useDisclosure,
  VStack,
  useColorMode,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Skeleton,
  Badge,
  Divider,
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
import ShareWorkoutModal from "./ShareWorkoutModal";
import EnhancedWorkoutEditor from "./EnhancedWorkoutEditor";
import { useThemeColors } from "../hooks/useThemeColors";
import { useCustomToast } from "../hooks/useCustomToast";

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
  const colors = useThemeColors();

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
    trainerUid: entry.trainerUid || null,
    trainerName: entry.trainerName || null,
    trainerUsername: entry.trainerUsername || null,
  });

  // Use profile cache if available, otherwise use defaults
  const cachedProfile = useMemo(() => {
    if (profileCache && profileCache.has(entry.uid)) {
      return profileCache.get(entry.uid);
    }
    return null;
  }, [profileCache, entry.uid]);

  const [profileImage, setProfileImage] = useState(() => {
    // Initialize with cached profile image if available, otherwise use default
    return (
      cachedProfile?.profileImage ||
      (colorMode === "dark" ? nightUrl : lightUrl)
    );
  });
  const [userDisplayName, setUserDisplayName] = useState(
    cachedProfile?.displayName || "Unknown User"
  );
  const [isUsername, setIsUsername] = useState(
    cachedProfile?.isUsername || false
  );

  // Trainer profile info for shared workouts
  const [trainerProfileImage, setTrainerProfileImage] = useState(
    colorMode === "dark" ? nightUrl : lightUrl
  );
  const [trainerDisplayName, setTrainerDisplayName] = useState(() => {
    // Initialize from entry data if available
    return entry.trainerName || entry.trainerUsername || null;
  });
  const [trainerIsUsername, setTrainerIsUsername] = useState(() => {
    // Initialize from entry data if available
    return !!entry.trainerUsername;
  });
  const [trainerProfileImageLoaded, setTrainerProfileImageLoaded] =
    useState(false);
  const [isLiked, setIsLiked] = useState(false); // Track if current user has liked this post
  const [imageLoaded, setImageLoaded] = useState(false);
  const [profileImageLoaded, setProfileImageLoaded] = useState(false);

  const [comment, setComment] = useState("");
  const [editingComment, setEditingComment] = useState(null);
  const [replyToComment, setReplyToComment] = useState(null);
  const [replyText, setReplyText] = useState("");
  const { deleteEntry, updateEntry, likeEntry, commentEntry } =
    useProductStore();
  const currentUserInfo = useProductStore((state) => state.currentUserInfo);

  // Debug currentUserInfo changes
  useEffect(() => {
    // currentUserInfo changes tracked
  }, [currentUserInfo]);

  // Get current user's display name for comments
  const getCurrentUserDisplayName = () => {
    if (!currentUserInfo) {
      // Check if user is authenticated but info not loaded yet
      if (auth.currentUser) {
        return "Loading...";
      }
      return "Anonymous";
    }
    return currentUserInfo.username
      ? `@${currentUserInfo.username}`
      : currentUserInfo.name || "User";
  };

  // Get current user's profile picture for comments
  const getCurrentUserProfilePicture = () => {
    if (!currentUserInfo) return colorMode === "dark" ? nightUrl : lightUrl;
    return (
      currentUserInfo.picture || (colorMode === "dark" ? nightUrl : lightUrl)
    );
  };

  const toast = useCustomToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();
  const {
    isOpen: isDetailOpen,
    onOpen: onDetailOpen,
    onClose: onDetailClose,
  } = useDisclosure();
  const {
    isOpen: isShareOpen,
    onOpen: onShareOpen,
    onClose: onShareClose,
  } = useDisclosure();
  const {
    isOpen: isEnhancedEditOpen,
    onOpen: onEnhancedEditOpen,
    onClose: onEnhancedEditClose,
  } = useDisclosure();

  // Update profile data when cache changes
  useEffect(() => {
    if (cachedProfile) {
      // Only update profile image if we have a valid cached profile image
      if (cachedProfile.profileImage) {
        setProfileImage(cachedProfile.profileImage);
      }
      setUserDisplayName(cachedProfile.displayName || "Unknown User");
      setIsUsername(cachedProfile.isUsername || false);
    }
  }, [cachedProfile]);

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
          // Only set to default if we don't already have a profile image
          if (
            !profileImage ||
            profileImage === (colorMode === "dark" ? nightUrl : lightUrl)
          ) {
            setProfileImage(colorMode === "dark" ? nightUrl : lightUrl);
          }
          setUserDisplayName("Unknown User");
        }
      } catch (error) {
        // Only set to default if we don't already have a profile image
        if (
          !profileImage ||
          profileImage === (colorMode === "dark" ? nightUrl : lightUrl)
        ) {
          setProfileImage(colorMode === "dark" ? nightUrl : lightUrl);
        }
        setUserDisplayName("Unknown User");
        toast.error("Error", "Failed to load profile image.");
      }
    };

    if (entry.uid && !cachedProfile) {
      fetchProfileImage();
    }

    // Always fetch trainer profile if this is a shared workout (independent of cachedProfile)
    if (entry.trainerUid) {
      fetchTrainerProfile();
    }
  }, [
    entry.uid,
    entry.trainerUid,
    entry.trainerName,
    entry.trainerUsername,
    toast,
    cachedProfile,
    colorMode,
  ]);

  // Fetch trainer profile info
  const fetchTrainerProfile = async () => {
    // If we already have trainer name/username from entry, use those
    if (entry.trainerName || entry.trainerUsername) {
      setTrainerDisplayName(entry.trainerName || entry.trainerUsername);
      setTrainerIsUsername(!!entry.trainerUsername);
    }

    // Always try to fetch profile image even if we have name/username
    if (!entry.trainerUid) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await apiClient.get(
        API_ENDPOINTS.PROFILE_IMAGE(entry.trainerUid),
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (response.data.success) {
        const data = response.data.data;
        if (data.picture) {
          setTrainerProfileImage(data.picture);
          setTrainerProfileImageLoaded(true);
        }
        if (data.name || data.username) {
          setTrainerDisplayName(data.name || data.username);
          setTrainerIsUsername(!!data.username);
        }
      }
    } catch (error) {
      // If we have trainer name/username from entry, still show it
      if (entry.trainerName || entry.trainerUsername) {
        setTrainerDisplayName(entry.trainerName || entry.trainerUsername);
        setTrainerIsUsername(!!entry.trainerUsername);
      }
    }
  };

  const handleTrainerProfileImageError = () => {
    setTrainerProfileImage(colorMode === "dark" ? nightUrl : lightUrl);
    setTrainerProfileImageLoaded(true);
  };

  const handleTrainerProfileImageLoad = () => {
    setTrainerProfileImageLoaded(true);
  };

  // Update profile image when color mode changes
  useEffect(() => {
    // Only update to default if we truly have no profile image and no cached profile
    if (!profileImage && !cachedProfile?.profileImage) {
      setProfileImage(colorMode === "dark" ? nightUrl : lightUrl);
    }
  }, [colorMode, profileImage, cachedProfile]);

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

  // Reset profile image loading state when profile image URL changes
  useEffect(() => {
    setProfileImageLoaded(false);
  }, [profileImage]);

  // Timeout fallback for profile images
  useEffect(() => {
    if (profileImage) {
      // For external URLs (Supabase), use a shorter timeout since onLoad might not fire
      const isExternalUrl =
        profileImage.includes("supabase.co") || profileImage.includes("http");
      const timeoutDuration = isExternalUrl ? 1000 : 3000;

      const timeout = setTimeout(() => {
        setProfileImageLoaded(true);
      }, timeoutDuration);

      return () => clearTimeout(timeout);
    }
  }, [profileImage]);

  // Debug log when updatedEntry changes
  useEffect(() => {
    // updatedEntry changes tracked
  }, [updatedEntry]);

  const handleFileUpload = async (file) => {
    try {
      // Use the image compression utility
      const { handleImageUploadWithCompression } = await import(
        "../utils/imageCompression"
      );

      await handleImageUploadWithCompression(
        file,
        (result) => {
          // Success callback
          const reader = new FileReader();
          reader.onloadend = () => {
            setUpdatedEntry({
              ...updatedEntry,
              image: reader.result,
              imageName: result.file.name,
            });
          };
          reader.readAsDataURL(result.file);

          // Show compression info if image was compressed
          if (result.wasCompressed) {
            toast.success(
              "Image Compressed",
              `Image compressed from ${result.originalSize} to ${result.compressedSize}`
            );
          }
        },
        (error) => {
          // Error callback
          toast.error("Upload Error", error);
        },
        { maxSizeMB: 5 }
      );
    } catch (error) {
      toast.error("Error", "Failed to process image. Please try again.");
    }
  };

  const handleDeleteEntry = async (pid) => {
    const { success, message } = await deleteEntry(pid);
    if (!success) {
      toast.error("Error", message);
    } else {
      toast.success("Success", message);
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
      toast.error("Error", message);
    } else {
      if (data) {
        const { name, description, likes, comments, image } = data;
        setUpdatedEntry((prevEntry) => {
          const newUpdatedEntry = {
            ...prevEntry,
            name,
            description,
            likes,
            comments,
            image, // Add the image field to update the UI
          };
          return newUpdatedEntry;
        });
        onUpdate(pid, data);
      }
      toast.success("Success", "Entry updated successfully");
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
      toast.error("Error", error.message);
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
      // Create comment object with current user info
      const newComment = {
        text: comment,
        createdAt: new Date().toISOString(),
        username: currentUserInfo?.username || null,
        name: currentUserInfo?.name || "User",
        picture: currentUserInfo?.picture || null,
        uid: currentUserInfo?.uid || null,
        likes: [],
        replies: [],
      };

      setUpdatedEntry((prevEntry) => ({
        ...prevEntry,
        comments: [...prevEntry.comments, newComment],
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

  // Handle comment like
  const handleCommentLike = async (commentId) => {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.LIKE_COMMENT(entry._id, commentId)
      );

      if (response.data.success) {
        setUpdatedEntry((prevEntry) => ({
          ...prevEntry,
          comments: prevEntry.comments.map((comment) => {
            if (comment._id === commentId) {
              const isLiked = comment.likes?.some(
                (like) => like.uid === currentUserInfo?.uid
              );
              const newLikes = isLiked
                ? comment.likes.filter(
                    (like) => like.uid !== currentUserInfo?.uid
                  )
                : [
                    ...(comment.likes || []),
                    {
                      uid: currentUserInfo?.uid,
                      username: currentUserInfo?.username,
                      name: currentUserInfo?.name,
                      picture: currentUserInfo?.picture,
                    },
                  ];
              return { ...comment, likes: newLikes };
            }
            return comment;
          }),
        }));
      }
    } catch (error) {
      toast.error("Error", "Failed to like comment");
    }
  };

  // Handle comment reply
  const handleCommentReply = async (commentId, replyText) => {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.REPLY_TO_COMMENT(entry._id, commentId),
        { text: replyText }
      );

      if (response.data.success) {
        const newReply = {
          text: replyText,
          createdAt: new Date().toISOString(),
          username: currentUserInfo?.username || null,
          name: currentUserInfo?.name || "User",
          picture: currentUserInfo?.picture || null,
          uid: currentUserInfo?.uid || null,
        };

        setUpdatedEntry((prevEntry) => ({
          ...prevEntry,
          comments: prevEntry.comments.map((comment) => {
            if (comment._id === commentId) {
              return {
                ...comment,
                replies: [...(comment.replies || []), newReply],
              };
            }
            return comment;
          }),
        }));

        setReplyText("");
        setReplyToComment(null);
        toast({
          title: "Success",
          description: "Reply added successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast.error("Error", "Failed to add reply");
    }
  };

  // Handle comment edit
  const handleCommentEdit = async (commentId, newText) => {
    try {
      const response = await apiClient.put(
        API_ENDPOINTS.EDIT_COMMENT(entry._id, commentId),
        { text: newText }
      );

      if (response.data.success) {
        setUpdatedEntry((prevEntry) => ({
          ...prevEntry,
          comments: prevEntry.comments.map((comment) => {
            if (comment._id === commentId) {
              return { ...comment, text: newText, edited: true };
            }
            return comment;
          }),
        }));

        setEditingComment(null);
        toast({
          title: "Success",
          description: "Comment updated successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast.error("Error", "Failed to edit comment");
    }
  };

  // Handle comment delete
  const handleCommentDelete = async (commentId) => {
    try {
      const response = await apiClient.delete(
        API_ENDPOINTS.DELETE_COMMENT(entry._id, commentId)
      );

      if (response.data.success) {
        setUpdatedEntry((prevEntry) => ({
          ...prevEntry,
          comments: prevEntry.comments.filter(
            (comment) => comment._id !== commentId
          ),
        }));

        toast({
          title: "Success",
          description: "Comment deleted successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast.error("Error", "Failed to delete comment");
    }
  };

  // Check if user can edit/delete a comment
  const canEditComment = (comment) => {
    return currentUserInfo?.uid === comment.uid || isOwner;
  };

  // Check if user has liked a comment
  const hasLikedComment = (comment) => {
    return (
      comment.likes?.some((like) => like.uid === currentUserInfo?.uid) || false
    );
  };

  const handleProcessWorkout = async () => {
    try {
      // Check if this looks like a workout post
      const exercises = parseWorkoutDescription(updatedEntry.description);
      const { split } = parseWorkoutTitle(updatedEntry.name);

      if (exercises.length === 0) {
        toast.warning(
          "Not a workout post",
          "This post doesn't contain workout data in the expected format."
        );
        return;
      }

      const response = await apiClient.post(
        API_ENDPOINTS.PROCESS_WORKOUT(entry._id)
      );

      if (response.data.success) {
        toast.success(
          "Success",
          `Workout data processed! Found ${exercises.length} exercises.`
        );
      }
    } catch (error) {
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
    <>
      <Box
        bg={colors.bgCard}
        borderRadius="4px"
        overflow="hidden"
        transition="all .33s ease-in-out"
        _hover={{
          shadow:
            colors.currentTheme === "light"
              ? "0 8px 25px rgba(0,0,0,0.12)"
              : "0 8px 25px rgba(0,0,0,0.3)",
        }}
        position="relative"
        cursor="pointer"
        onClick={onDetailOpen}
        // Container that adapts to content
        maxW="400px"
        w="100%"
        mx="auto"
        alignSelf="center"
      >
        {/* Image container with fixed aspect ratio */}
        <Box
          position="relative"
          w="full"
          aspectRatio="4/5"
          overflow="hidden"
          display="flex"
          alignItems="center"
          justifyContent="center"
          sx={{
            "--aspect-ratio": "1.25", // 4:5 ratio (5/4 = 1.25)
            "&::before": {
              content: '""',
              display: "block",
              paddingTop: "calc(100% / var(--aspect-ratio))",
              width: "100%",
            },
          }}
        >
          {!imageLoaded && (
            <Skeleton
              w="full"
              h="auto"
              aspectRatio="4/5"
              startColor={colors.borderColor}
              endColor={colors.borderColorInput}
            />
          )}
          <Image
            src={updatedEntry.image || entry.image}
            alt={entry.name}
            w="full"
            h="auto"
            objectFit="cover"
            objectPosition="center"
            onError={handleImageError}
            onLoad={handleImageLoad}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              display: imageLoaded ? "block" : "none",
              opacity: imageLoaded ? 1 : 0,
              transition: "opacity 0.3s ease-in-out",
              aspectRatio: "4/5",
              width: "100%",
              height: "auto",
            }}
            loading="lazy"
          />

          {/* Description overlay with gradient background */}
          <Box
            position="absolute"
            bottom="0"
            left="0"
            right="0"
            p="8px"
            background={
              colors.currentTheme === "light"
                ? "linear-gradient(to top, white 0%, rgba(0, 0, 0, 0.1) 50%, rgba(255, 255, 255, 0.1) 100%)"
                : "linear-gradient(to top, #1a202cfc 0%, rgb(0 0 0 / 74%) 50%, rgb(0 0 0 / 54%) 100%)"
            }
            backdropFilter="blur(2px)"
            display="flex"
            flexDirection="column"
            justifyContent="center"
            minH="180px"
          >
            <Box
              w="full"
              maxH="180px"
              overflowY="auto"
              overflowX="hidden"
              css={{
                "&::-webkit-scrollbar": {
                  width: "3px",
                },
                "&::-webkit-scrollbar-track": {
                  background: "transparent",
                },
                "&::-webkit-scrollbar-thumb": {
                  background: "#CBD5E0",
                  borderRadius: "2px",
                },
                "&::-webkit-scrollbar-thumb:hover": {
                  background: "#A0AEC0",
                },
              }}
            >
              <VStack spacing={0.5} align="stretch" w="full">
                <Heading
                  as="h2"
                  size="sm"
                  color={colors.textTitle}
                  fontFamily="Inter, system-ui, sans-serif"
                  noOfLines={1}
                  fontWeight="400"
                  textAlign="center"
                >
                  {updatedEntry.name}
                </Heading>
                <Text
                  color={colors.textOne}
                  fontFamily="Inter, system-ui, sans-serif"
                  fontSize="10px"
                  fontWeight="700"
                  textAlign="center"
                >
                  {formatDateHour(updatedEntry.createdAt)}
                  {" • "}
                  {formatDateTitleTime(updatedEntry.createdAt)}
                </Text>

                <Text
                  color={colors.textDesc}
                  fontSize="12px"
                  fontFamily="Inter, system-ui, sans-serif"
                  lineHeight="1.4"
                  fontWeight="400"
                  whiteSpace="pre-wrap"
                  wordBreak="break-word"
                  textAlign="center"
                >
                  {updatedEntry.description}
                </Text>
              </VStack>
            </Box>
          </Box>
        </Box>
        <HStack
          position="absolute"
          top="12px"
          left="12px"
          spacing={2}
          bg={colors.currentTheme === "light" ? "rgba(255, 255, 255, 0.95)" : "rgba(45, 55, 72, 0.95)"}
          px={3}
          py={2}
          borderRadius="12px"
          shadow="0 2px 8px rgba(0,0,0,0.1)"
          onClick={(e) => e.stopPropagation()}
          backdropFilter="blur(8px)"
        >
          {updatedEntry.trainerUid && updatedEntry.trainerUid !== entry.uid ? (
            // Show both trainer and client usernames for shared workouts
            <>
              <Box position="relative" boxSize="28px">
                {!trainerProfileImageLoaded && (
                  <Skeleton
                    boxSize="28px"
                    borderRadius="full"
                    startColor={colors.borderColor}
                    endColor={colors.borderColorInput}
                  />
                )}
                <Image
                  src={trainerProfileImage}
                  alt="Trainer Profile"
                  boxSize="28px"
                  borderRadius="full"
                  objectFit="cover"
                  border="2px solid white"
                  onError={handleTrainerProfileImageError}
                  onLoad={handleTrainerProfileImageLoad}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    display: trainerProfileImageLoaded ? "block" : "none",
                    opacity: trainerProfileImageLoaded ? 1 : 0,
                    transition: "opacity 0.3s ease-in-out",
                  }}
                  loading="lazy"
                />
              </Box>
              <Link to={`/user/${updatedEntry.trainerUid}`}>
                <Text
                  fontSize="12px"
                  fontWeight="600"
                  color={colors.textTitle}
                  fontFamily="Inter, system-ui, sans-serif"
                  maxW="80px"
                  noOfLines={1}
                  _hover={{ textDecoration: "underline" }}
                  cursor="pointer"
                >
                  {trainerIsUsername && trainerDisplayName
                    ? `@${trainerDisplayName}`
                    : trainerDisplayName || "Trainer"}
                </Text>
              </Link>
              <Text fontSize="12px" color={colors.textMuted} fontWeight="500">
                →
              </Text>
              <Box position="relative" boxSize="28px">
                {!profileImageLoaded && (
                  <Skeleton
                    boxSize="28px"
                    borderRadius="full"
                    startColor={colors.borderColor}
                    endColor={colors.borderColorInput}
                  />
                )}
                <Image
                  src={profileImage}
                  alt="User Profile"
                  boxSize="28px"
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
                  fontSize="12px"
                  fontWeight="600"
                  color={colors.textTitle}
                  fontFamily="Inter, system-ui, sans-serif"
                  maxW="80px"
                  noOfLines={1}
                  _hover={{ textDecoration: "underline" }}
                  cursor="pointer"
                >
                  {isUsername ? `@${userDisplayName}` : userDisplayName}
                </Text>
              </Link>
            </>
          ) : (
            // Show only client username for regular posts
            <>
              <Box position="relative" boxSize="28px">
                {!profileImageLoaded && (
                  <Skeleton
                    boxSize="28px"
                    borderRadius="full"
                    startColor={colors.borderColor}
                    endColor={colors.borderColorInput}
                  />
                )}
                <Image
                  src={profileImage}
                  alt="User Profile"
                  boxSize="28px"
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
                  fontSize="13px"
                  fontWeight="600"
                  color={colors.textTitle}
                  fontFamily="Inter, system-ui, sans-serif"
                  maxW="100px"
                  noOfLines={1}
                  _hover={{ textDecoration: "underline" }}
                  cursor="pointer"
                >
                  {isUsername ? `@${userDisplayName}` : userDisplayName}
                </Text>
              </Link>
            </>
          )}
        </HStack>
        {/* Like and comment count badges - positioned below image */}
        <Box p="6px">
          {(Array.isArray(updatedEntry.likes) &&
            updatedEntry.likes.length > 0) ||
          (Array.isArray(updatedEntry.comments) &&
            updatedEntry.comments.length > 0) ? (
            <VStack spacing={2} justify="start" w="full" flexShrink="0">
              <HStack spacing={2} justify="start" w="full">
                {Array.isArray(updatedEntry.likes) &&
                  updatedEntry.likes.length > 0 && (
                    <Badge
                      colorScheme="yellow"
                      variant="subtle"
                      fontSize="10px"
                      px={2}
                      py={1}
                      borderRadius="6px"
                    >
                      ❤️ {updatedEntry.likes.length}
                    </Badge>
                  )}

                {Array.isArray(updatedEntry.comments) &&
                  updatedEntry.comments.length > 0 && (
                    <Badge
                      colorScheme="blue"
                      variant="subtle"
                      fontSize="10px"
                      px={2}
                      py={1}
                      borderRadius="6px"
                    >
                      💬 {updatedEntry.comments.length}
                    </Badge>
                  )}
              </HStack>
            </VStack>
          ) : null}
        </Box>

        {/* Bottom section with buttons and comment box - falls to bottom */}
        <VStack
          spacing={2}
          mt={3}
          pt={2}
          flexShrink="0"
          borderTop="1px solid"
          borderColor={colors.borderColorLight}
        >
          {/* Comment Section - Show for all users */}
          <Box w="full" px={3} onClick={(e) => e.stopPropagation()}>
            <HStack spacing={2} w="full">
              <Input
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                size="sm"
                fontSize="11px"
                borderRadius="4px"
                borderColor={colors.borderColor}
                _focus={{
                  borderColor: "blue.400",
                  boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
                }}
                h="28px"
                flex={1}
              />
              <Button
                colorScheme="blue"
                onClick={() => handleCommentEntry(entry._id, comment)}
                px={3}
                py={1}
                size="sm"
                fontSize="11px"
                borderRadius="4px"
                fontWeight="500"
                h="28px"
                isDisabled={!comment.trim()}
                _disabled={{
                  opacity: 0.6,
                  cursor: "not-allowed",
                }}
              >
                Post
              </Button>
            </HStack>
          </Box>

          {/* Action Buttons - Restructured layout */}
          {isOwner ? (
            // Owner view: Like, edit, and menu buttons
            <HStack
              w="full"
              justify="space-between"
              spacing={0}
              pt={0}
              pb={0}
              onClick={(e) => e.stopPropagation()}
            >
              <IconButton
                onClick={() => handleLikeEntry(entry._id)}
                icon={<StarIcon />}
                py={7}
                px={4}
                bg={isLiked ? colors.likeBg : "transparent"}
                color={isLiked ? colors.likeActive : colors.textSecondary}
                size="sm"
                borderRadius="0px"
                _hover={{
                  bg: isLiked ? colors.likeBgHover : colors.bgHover,
                }}
                transition="all 0.2s"
              />
              <IconButton
                onClick={onOpen}
                icon={<EditIcon />}
                bg="transparent"
                color={colors.textSecondary}
                borderRadius="0px"
                size="sm"
                py={7}
                flex={1}
                _hover={{
                  bg: colors.bgHover,
                }}
                transition="all 0.2s"
              />
              <Menu>
                <MenuButton
                  as={IconButton}
                  icon={<HamburgerIcon />}
                  py={7}
                  px={4}
                  color={colors.textSecondary}
                  variant="ghost"
                  size="sm"
                  borderRadius="0px"
                  _hover={{
                    bg: colors.bgHover,
                  }}
                  transition="all 0.2s"
                />
                <MenuList>
                  <MenuItem
                    icon={<EditIcon />}
                    onClick={onEnhancedEditOpen}
                    color="green.500"
                    _hover={{
                      bg: colors.editBg,
                    }}
                  >
                    Enhanced Edit
                  </MenuItem>
                  <MenuItem
                    onClick={handleProcessWorkout}
                    color="blue.500"
                    _hover={{
                      bg: colors.processBg,
                    }}
                  >
                    Process Workout Data
                  </MenuItem>
                  <MenuItem
                    icon={<FiShare2 />}
                    onClick={onShareOpen}
                    color="green.500"
                    _hover={{
                      bg: colors.editBg,
                    }}
                  >
                    Share Workout
                  </MenuItem>
                  <MenuItem
                    icon={<DeleteIcon />}
                    onClick={onDeleteOpen}
                    color="red.500"
                    _hover={{
                      bg: colors.deleteBg,
                    }}
                  >
                    Delete Post
                  </MenuItem>
                </MenuList>
              </Menu>
            </HStack>
          ) : (
            // Non-owner view: Like button only
            <HStack
              w="full"
              justify="flex-start"
              pt={1}
              pb={0}
              onClick={(e) => e.stopPropagation()}
            >
              <IconButton
                onClick={() => handleLikeEntry(entry._id)}
                icon={<StarIcon />}
                bg={isLiked ? colors.likeBg : "transparent"}
                color={isLiked ? colors.likeActive : colors.textSecondary}
                size="sm"
                borderRadius="4px"
                _hover={{
                  bg: isLiked ? colors.likeBgHover : colors.bgHover,
                }}
                transition="all 0.2s"
              />
            </HStack>
          )}
        </VStack>
      </Box>

      {/* Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={onDetailClose} size="xl">
        <ModalOverlay />
        <ModalContent
          maxW={{ base: "90vw", md: "600px" }}
          mx={{ base: 2, md: 4 }}
          maxH={{ base: "95vh", md: "90vh" }}
          overflow="hidden"
          aspectRatio={{ base: "2/3", md: "3/4" }}
          minH={{ base: "80vh", md: "600px" }}
          borderRadius="4px"
          bg={colors.bgCard}
        >
          <ModalHeader
            fontFamily="Arial, sans-serif"
            px={{ base: 3, md: 6 }}
            py={{ base: 3, md: 4 }}
            fontSize={{ base: "md", md: "lg" }}
            color={colors.textPrimary}
            bg={colors.bgCard}
          >
            <HStack spacing={{ base: 2, md: 3 }}>
              <Box position="relative" boxSize={{ base: "32px", md: "40px" }}>
                <Image
                  src={profileImage}
                  alt="User Profile"
                  boxSize={{ base: "32px", md: "40px" }}
                  borderRadius="full"
                  objectFit="cover"
                  border="2px solid white"
                />
              </Box>
              <VStack align="start" spacing={0}>
                <HStack spacing={2} w="full" align="start">
                  <Text
                    fontWeight="bold"
                    fontSize={{ base: "sm", md: "lg" }}
                    noOfLines={1}
                    flex="1"
                    color={colors.textPrimary}
                  >
                    {isUsername ? `@${userDisplayName}` : userDisplayName}
                  </Text>
                  <Text
                    fontSize={{ base: "xs", md: "sm" }}
                    color={colors.textMuted}
                    flexShrink={0}
                  >
                    {formatDateHour(updatedEntry.createdAt)} -{" "}
                    {formatDateTitleTime(updatedEntry.createdAt)}
                  </Text>
                </HStack>
              </VStack>
            </HStack>
          </ModalHeader>
          <ModalCloseButton
            size={{ base: "sm", md: "md" }}
            color={colors.textMuted}
          />
          <ModalBody
            px={{ base: 2, md: 3 }}
            py={{ base: 1, md: 2 }}
            overflowY="auto"
            display="flex"
            flexDirection="column"
            bg={colors.bgCard}
          >
            <VStack spacing={{ base: 3, md: 4 }} align="stretch">
              {/* Image Section */}
              <Box
                w="full"
                aspectRatio="4/5"
                overflow="hidden"
                borderRadius="4px"
              >
                <Image
                  src={updatedEntry.image || entry.image}
                  alt={entry.name}
                  w="full"
                  h="auto"
                  objectFit="cover"
                  objectPosition="center"
                  style={{
                    aspectRatio: "4/5",
                    width: "100%",
                    height: "auto",
                  }}
                  fallback={<Skeleton h="auto" aspectRatio="4/5" />}
                />
              </Box>

              {/* Content Section - Fixed height for consistency */}
              <VStack align="start" spacing={{ base: 2, md: 3 }} flexShrink={0}>
                <VStack spacing={0} w="full" align="center">
                  <Heading
                    size={{ base: "sm", md: "md" }}
                    color={colors.textTitle}
                    fontFamily="Arial, sans-serif"
                    textAlign="center"
                    noOfLines={1}
                    fontWeight="400"
                  >
                    {updatedEntry.name}
                  </Heading>
                  <Text
                    fontSize={{ base: "xs", md: "sm" }}
                    color={colors.textMuted}
                    textAlign="center"
                    fontWeight="700"
                  >
                    {formatDateHour(updatedEntry.createdAt)} -{" "}
                    {formatDateTitleTime(updatedEntry.createdAt)}
                  </Text>
                </VStack>

                <Box
                  w="full"
                  maxH="120px"
                  overflowY="auto"
                  overflowX="hidden"
                  css={{
                    "&::-webkit-scrollbar": {
                      width: "4px",
                    },
                    "&::-webkit-scrollbar-track": {
                      background: "transparent",
                    },
                    "&::-webkit-scrollbar-thumb": {
                      background: "#CBD5E0",
                      borderRadius: "2px",
                    },
                    "&::-webkit-scrollbar-thumb:hover": {
                      background: "#A0AEC0",
                    },
                  }}
                >
                  <Text
                    color={colors.textDesc}
                    fontFamily="Arial, sans-serif"
                    whiteSpace="pre-wrap"
                    fontSize={{ base: "xs", md: "sm" }}
                    lineHeight="1.4"
                    textAlign="center"
                    wordBreak="break-word"
                  >
                    {updatedEntry.description}
                  </Text>
                </Box>

                <Divider />

                {/* Likes Section */}
                {Array.isArray(updatedEntry.likes) &&
                  updatedEntry.likes.length > 0 && (
                    <Box w="full">
                      <Text
                        fontWeight="semibold"
                        mb={1}
                        color={colors.textDesc}
                        fontSize={{ base: "xs", md: "sm" }}
                      >
                        Liked by {updatedEntry.likes.length} people:
                      </Text>
                      <Box
                        fontSize={{ base: "xs", md: "sm" }}
                        color={colors.textDesc}
                        lineHeight="1.3"
                        noOfLines={1}
                      >
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

                {/* Comments Section */}
                <Box w="full">
                  <Text
                    fontWeight="semibold"
                    mb={2}
                    color={colors.textDesc}
                    fontSize={{ base: "sm", md: "md" }}
                  >
                    Comments (
                    {Array.isArray(updatedEntry.comments)
                      ? updatedEntry.comments.length
                      : 0}
                    )
                  </Text>

                  {/* Comment Input Section */}
                  <Box
                    p={{ base: 2, md: 3 }}
                    bg={colors.bgMuted}
                    borderRadius="lg"
                    mb={3}
                    border="1px solid"
                    borderColor={colors.borderColor}
                  >
                    <VStack spacing={2} w="full">
                      <Textarea
                        placeholder="Write a comment..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        size="sm"
                        resize="none"
                        rows={1}
                        borderRadius="md"
                        borderColor={colors.borderColorInput}
                        _focus={{
                          borderColor: "blue.400",
                          boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
                        }}
                        bg={colors.bgCard}
                        fontSize={{ base: "xs", md: "sm" }}
                      />
                      <HStack justify="end" w="full">
                        <Button
                          colorScheme="blue"
                          onClick={() => handleCommentEntry(entry._id, comment)}
                          size="xs"
                          px={{ base: 3, md: 4 }}
                          fontSize={{ base: "xs", md: "sm" }}
                          isDisabled={!comment.trim()}
                          _disabled={{
                            opacity: 0.6,
                            cursor: "not-allowed",
                          }}
                        >
                          Post
                        </Button>
                      </HStack>
                    </VStack>
                  </Box>

                  {/* Comments List */}
                  {Array.isArray(updatedEntry.comments) &&
                    updatedEntry.comments.length > 0 && (
                      <VStack
                        spacing={2}
                        align="start"
                        maxH={{ base: "120px", md: "150px" }}
                        overflowY="auto"
                        w="full"
                        flexShrink={0}
                      >
                        {updatedEntry.comments.map((comment, index) => (
                          <Box
                            key={comment._id || index}
                            p={{ base: 2, md: 3 }}
                            bg={colors.bgMuted}
                            rounded="lg"
                            w="full"
                            border="1px solid"
                            borderColor={colors.borderColor}
                          >
                            <HStack
                              spacing={{ base: 2, md: 3 }}
                              alignItems="flex-start"
                            >
                              <Box
                                position="relative"
                                boxSize={{ base: "24px", md: "28px" }}
                                flexShrink={0}
                              >
                                <Image
                                  src={
                                    comment.picture ||
                                    getCurrentUserProfilePicture()
                                  }
                                  alt="Commenter Profile"
                                  boxSize={{ base: "24px", md: "28px" }}
                                  borderRadius="full"
                                  objectFit="cover"
                                  border="2px solid"
                                  borderColor={colors.borderColor}
                                />
                              </Box>
                              <VStack align="start" spacing={1} flex={1}>
                                <VStack align="start" spacing={1} w="full">
                                  <HStack
                                    spacing={2}
                                    alignItems="center"
                                    w="full"
                                    justify="space-between"
                                    flexWrap="wrap"
                                  >
                                    <HStack
                                      spacing={2}
                                      alignItems="center"
                                      flexWrap="wrap"
                                    >
                                      <Text
                                        fontWeight="600"
                                        fontSize={{ base: "xs", md: "sm" }}
                                        color={colors.textDesc}
                                        noOfLines={1}
                                      >
                                        {comment.username
                                          ? `@${comment.username}`
                                          : comment.name ||
                                            getCurrentUserDisplayName()}
                                      </Text>
                                      <Text
                                        fontSize={{ base: "xs", md: "xs" }}
                                        color={colors.textMuted}
                                      >
                                        {formatDate(comment.createdAt)}
                                      </Text>
                                      {comment.edited && (
                                        <Text
                                          fontSize={{ base: "xs", md: "xs" }}
                                          color="gray.400"
                                        >
                                          (edited)
                                        </Text>
                                      )}
                                    </HStack>
                                    {canEditComment(comment) && (
                                      <Menu>
                                        <MenuButton
                                          as={IconButton}
                                          icon={<HamburgerIcon />}
                                          size={{ base: "xs", md: "xs" }}
                                          variant="ghost"
                                          color={colors.textMuted}
                                        />
                                        <MenuList>
                                          <MenuItem
                                            icon={<EditIcon />}
                                            onClick={() =>
                                              setEditingComment(comment._id)
                                            }
                                            fontSize={{ base: "sm", md: "md" }}
                                          >
                                            Edit
                                          </MenuItem>
                                          <MenuItem
                                            icon={<DeleteIcon />}
                                            color="red.500"
                                            onClick={() =>
                                              handleCommentDelete(comment._id)
                                            }
                                            fontSize={{ base: "sm", md: "md" }}
                                          >
                                            Delete
                                          </MenuItem>
                                        </MenuList>
                                      </Menu>
                                    )}
                                  </HStack>
                                </VStack>

                                {/* Comment Text */}
                                {editingComment === comment._id ? (
                                  <VStack spacing={2} w="full">
                                    <Textarea
                                      value={comment.text}
                                      onChange={(e) => {
                                        setUpdatedEntry((prevEntry) => ({
                                          ...prevEntry,
                                          comments: prevEntry.comments.map(
                                            (c) =>
                                              c._id === comment._id
                                                ? {
                                                    ...c,
                                                    text: e.target.value,
                                                  }
                                                : c
                                          ),
                                        }));
                                      }}
                                      size="sm"
                                      resize="none"
                                      rows={2}
                                      fontSize={{ base: "sm", md: "md" }}
                                    />
                                    <HStack spacing={2}>
                                      <Button
                                        size={{ base: "xs", md: "sm" }}
                                        colorScheme="blue"
                                        onClick={() =>
                                          handleCommentEdit(
                                            comment._id,
                                            comment.text
                                          )
                                        }
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        size={{ base: "xs", md: "sm" }}
                                        variant="ghost"
                                        onClick={() => setEditingComment(null)}
                                      >
                                        Cancel
                                      </Button>
                                    </HStack>
                                  </VStack>
                                ) : (
                                  <Text
                                    color={colors.textDesc}
                                    fontFamily="Inter, system-ui, sans-serif"
                                    fontSize={{ base: "xs", md: "sm" }}
                                    lineHeight="1.3"
                                    noOfLines={2}
                                  >
                                    {comment.text}
                                  </Text>
                                )}

                                {/* Comment Actions */}
                                <HStack spacing={{ base: 2, md: 3 }} pt={1}>
                                  <Button
                                    size={{ base: "xs", md: "xs" }}
                                    variant="ghost"
                                    leftIcon={<StarIcon />}
                                    color={
                                      hasLikedComment(comment)
                                        ? "red.500"
                                        : colors.textMuted
                                    }
                                    onClick={() =>
                                      handleCommentLike(comment._id)
                                    }
                                    fontSize={{ base: "xs", md: "xs" }}
                                  >
                                    {comment.likes?.length || 0}
                                  </Button>
                                  <Button
                                    size={{ base: "xs", md: "xs" }}
                                    variant="ghost"
                                    leftIcon={<ChatIcon />}
                                    color={colors.textMuted}
                                    onClick={() =>
                                      setReplyToComment(comment._id)
                                    }
                                    fontSize={{ base: "xs", md: "xs" }}
                                  >
                                    Reply
                                  </Button>
                                </HStack>

                                {/* Reply Input */}
                                {replyToComment === comment._id && (
                                  <Box w="full" pt={2}>
                                    <VStack spacing={2}>
                                      <Textarea
                                        placeholder="Write a reply..."
                                        value={replyText}
                                        onChange={(e) =>
                                          setReplyText(e.target.value)
                                        }
                                        size="sm"
                                        resize="none"
                                        rows={2}
                                        fontSize={{ base: "sm", md: "md" }}
                                      />
                                      <HStack spacing={2}>
                                        <Button
                                          size={{ base: "xs", md: "sm" }}
                                          colorScheme="blue"
                                          onClick={() =>
                                            handleCommentReply(
                                              comment._id,
                                              replyText
                                            )
                                          }
                                          isDisabled={!replyText.trim()}
                                        >
                                          Reply
                                        </Button>
                                        <Button
                                          size={{ base: "xs", md: "sm" }}
                                          variant="ghost"
                                          onClick={() => {
                                            setReplyToComment(null);
                                            setReplyText("");
                                          }}
                                        >
                                          Cancel
                                        </Button>
                                      </HStack>
                                    </VStack>
                                  </Box>
                                )}

                                {/* Replies */}
                                {comment.replies &&
                                  comment.replies.length > 0 && (
                                    <VStack
                                      spacing={1}
                                      w="full"
                                      pl={{ base: 2, md: 3 }}
                                      borderLeft="2px solid"
                                      borderColor={colors.borderColor}
                                    >
                                      {comment.replies.map(
                                        (reply, replyIndex) => (
                                          <Box
                                            key={reply._id || replyIndex}
                                            p={{ base: 1, md: 2 }}
                                            bg={colors.bgHover}
                                            rounded="md"
                                            w="full"
                                          >
                                            <HStack
                                              spacing={2}
                                              alignItems="flex-start"
                                            >
                                              <Box
                                                position="relative"
                                                boxSize={{
                                                  base: "16px",
                                                  md: "20px",
                                                }}
                                                flexShrink={0}
                                              >
                                                <Image
                                                  src={
                                                    reply.picture ||
                                                    getCurrentUserProfilePicture()
                                                  }
                                                  alt="Reply Profile"
                                                  boxSize={{
                                                    base: "16px",
                                                    md: "20px",
                                                  }}
                                                  borderRadius="full"
                                                  objectFit="cover"
                                                />
                                              </Box>
                                              <VStack
                                                align="start"
                                                spacing={1}
                                                flex={1}
                                              >
                                                <HStack
                                                  spacing={2}
                                                  alignItems="center"
                                                  flexWrap="wrap"
                                                >
                                                  <Text
                                                    fontWeight="600"
                                                    fontSize={{
                                                      base: "xs",
                                                      md: "xs",
                                                    }}
                                                    color={colors.textDesc}
                                                    noOfLines={1}
                                                  >
                                                    {reply.username
                                                      ? `@${reply.username}`
                                                      : reply.name || "User"}
                                                  </Text>
                                                  <Text
                                                    fontSize={{
                                                      base: "xs",
                                                      md: "xs",
                                                    }}
                                                    color={colors.textMuted}
                                                  >
                                                    {formatDate(
                                                      reply.createdAt
                                                    )}
                                                  </Text>
                                                </HStack>
                                                <Text
                                                  color={colors.textDesc}
                                                  fontSize={{
                                                    base: "xs",
                                                    md: "xs",
                                                  }}
                                                  lineHeight="1.3"
                                                  noOfLines={1}
                                                >
                                                  {reply.text}
                                                </Text>
                                              </VStack>
                                            </HStack>
                                          </Box>
                                        )
                                      )}
                                    </VStack>
                                  )}
                              </VStack>
                            </HStack>
                          </Box>
                        ))}
                      </VStack>
                    )}
                </Box>
              </VStack>
            </VStack>
          </ModalBody>
          <ModalFooter
            px={{ base: 3, md: 6 }}
            py={{ base: 2, md: 4 }}
            flexShrink={0}
            bg={colors.bgCard}
          >
            <Button
              variant="ghost"
              onClick={onDetailClose}
              size={{ base: "sm", md: "md" }}
              color={colors.textPrimary}
              _hover={{ bg: colors.bgHover }}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent bg={colors.bgCard}>
          <ModalHeader
            fontFamily="Arial, sans-serif"
            color={colors.textPrimary}
          >
            Update Entry
          </ModalHeader>
          <ModalCloseButton color={colors.textSecondary} />
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
                bg={colors.bgMuted}
                color={colors.textPrimary}
                borderColor={colors.border}
                _placeholder={{ color: colors.textMuted }}
                _focus={{ borderColor: colors.border, bg: colors.bgMuted }}
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
                bg={colors.bgMuted}
                color={colors.textPrimary}
                borderColor={colors.border}
                _placeholder={{ color: colors.textMuted }}
                _focus={{ borderColor: colors.border, bg: colors.bgMuted }}
              />
              <Image
                src={
                  updatedEntry.image ||
                  entry.image ||
                  "https://coffective.com/wp-content/uploads/2018/06/default-featured-image.png.jpg"
                }
                alt="Entry Image"
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
              color={colors.textSecondary}
              _hover={{ bg: colors.bgHover }}
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalOverlay />
        <ModalContent bg={colors.bgCard}>
          <ModalHeader color={colors.textPrimary}>Confirm Delete</ModalHeader>
          <ModalCloseButton color={colors.textMuted} />
          <ModalBody>
            <Text color={colors.textPrimary}>
              Are you sure you want to delete this entry?
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="red"
              onClick={() => handleDeleteEntry(entry._id)}
            >
              Delete
            </Button>
            <Button
              variant="ghost"
              onClick={onDeleteClose}
              color={colors.textPrimary}
              _hover={{ bg: colors.bgHover }}
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Share Workout Modal */}
      <ShareWorkoutModal
        isOpen={isShareOpen}
        onClose={onShareClose}
        entry={updatedEntry}
      />

      {/* Enhanced Workout Editor */}
      <EnhancedWorkoutEditor
        isOpen={isEnhancedEditOpen}
        onClose={onEnhancedEditClose}
        entry={entry}
        onUpdate={handleUpdateEntry}
        onSuccess={() => {
          toast.success("Success", "Workout updated successfully");
        }}
      />
    </>
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
