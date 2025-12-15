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
  VStack,
  useColorMode,
} from "@chakra-ui/react";
import { useProductStore } from "../store/product";
import { useCustomToast } from "../hooks/useCustomToast";
import { useThemeColors } from "../hooks/useThemeColors";
import { useState, useEffect } from "react";
// import PropTypes from "prop-types";
import { auth } from "../firebase";
import light from "../assets/light.jpg";
import night from "../assets/night.jpg";

// Convert Vite asset imports to actual URLs
const lightUrl = new URL("../assets/light.jpg", import.meta.url).href;
const nightUrl = new URL("../assets/night.jpg", import.meta.url).href;

const ModifyProfile = ({ entry }) => {
  const { editProfileData } = useProductStore();

  const [updatedEntry, setUpdatedEntry] = useState(entry);
  const [comment, setComment] = useState("");
  const textColorTitle = useColorModeValue("gray.600", "gray.500");
  const textColor = useColorModeValue("gray.200", "gray.200");
  const textColorDesc = useColorModeValue("gray.700", "gray.400");
  const textColorOne = useColorModeValue("gray.300", "gray.700");
  const bg = useColorModeValue("white", "gray.800");
  const { colorMode } = useColorMode();
  const profileColorMode = useColorModeValue(lightUrl, nightUrl);
  const { deleteEntry, updateEntry, likeEntry, commentEntry } =
    useProductStore();

  const toast = useCustomToast();
  const colors = useThemeColors();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();

  const [profileData, setProfileData] = useState({
    username: "",
    name: "",
    picture: "",
    bio: "",
  });

  const [userProfile, setUserProfile] = useState({
    name: "",
    goal: "",
    gymName: "",
    postsCount: 0,
    profileImage: "",
    bio: "",
  });

  const { fetchEntrys, entrys, clearEntrys } = useProductStore();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [uid, setUid] = useState(null);
  const [entries, setEntries] = useState([]);

  const handleDeleteEntry = async (pid) => {
    const { success, message } = await deleteEntry(pid);
    if (!success) {
      toast.error("Error", message);
    } else {
      toast.success("Success", message);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setIsSignedIn(true);
        setUid(user.uid);
        // fetchUserProfile(user);
        fetchUserProfile(user);
      } else {
        setUid(null);
        clearEntrys();
        setUserProfile({
          name: "",
          goal: "",
          gymName: "",
          postsCount: 0,
          profileImage: "",
          bio: "",
        });
      }
    });

    return () => unsubscribe();
  }, [clearEntrys]);

  const handleUpdateEntry = async (pid, updatedEntry) => {
    const { success, message } = await updateEntry(pid, updatedEntry);
    onClose();
    if (!success) {
      toast.error("Error", message);
    } else {
      toast.success("Success", "Product updated successfully");
    }
  };

  const handleLikeEntry = async (pid) => {
    const { success, message } = await likeEntry(pid);
    if (!success) {
      toast.error("Error", message);
    } else {
      setUpdatedEntry((prevEntry) => ({
        ...prevEntry,
        likes: prevEntry.likes + 1,
      }));
      toast.success("Success", "Entry liked successfully");
    }
  };

  const handleCommentEntry = async (pid, comment) => {
    const { success, message } = await commentEntry(pid, comment);
    if (!success) {
      toast.error("Error", message);
    } else {
      setUpdatedEntry((prevEntry) => ({
        ...prevEntry,
        comments: [
          ...prevEntry.comments,
          { text: comment, createdAt: new Date() },
        ],
      }));
      setComment("");
      toast.success("Success", "Comment added successfully");
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

  // create a function to format the date into a string and abbreviate the month
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
    const formattedDate = date.toLocaleString("en-US", options);
    return `${formattedDate}`;
  };

  const fetchUserProfile = async (user) => {
    // const auth = getAuth();
    // const user = auth.currentUser;
    // const token = user ? await user.getIdToken() : null;
    const token = await user.accessToken;
    const uid = await user.uid;
    // if (user) {
    //   user
    //     .getIdToken()
    //     .then((idToken) => {
    //       // Send token to your backend via HTTPS
    //     })
    //     .catch((error) => {
    //       // Handle error
    //     });
    // } else {
    //   // No user is signed in.
    // }
    try {
      if (!token) {
        return;
      }

      // const token = await user.getIdToken();
      const response = await fetch(
        `https://gym-tracker-brown.vercel.app/api/getUserProfile/${uid}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch user profile: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setUserProfile({
          name: data.data.name || "Anonymous",
          goal: data.goal || "Not set",
          gymName: data.data.gymName || "Not specified",
          postsCount: data.postsCount,
          bio: data.data.bio || "No bio available",
          profileImage:
            data.data.picture ||
            "https://johnjayathletics.com/images/logos/site/site.png",
        });
      } else {
      }
    } catch (error) {}
  };

  return (
    <Box
      shadow="lg"
      rounded="lg"
      overflow="hidden"
      transition="all 0.3s"
      _hover={{ transform: "translateY(-5px)", shadow: "xl" }}
      bg={bg}
    >
      <Image
        // src={entry.image}
        // alt={entry.name}
        h={48}
        w="full"
        objectFit="cover"
      />
      <VStack className="px-8" spacing={4} p="8px 8px 8px 8px">
        <Heading
          as={"h2"}
          size={"lg"}
          color={textColorTitle}
          fontFamily="Arial, sans-serif"
        >
          {/* {updatedEntry.name} */}
          {/* - {formatDateTitle(updatedEntry.createdAt)} */}
        </Heading>
        <Text
          // colorScheme="gray"
          color={textColorOne}
          fontFamily="Arial, sans-serif"
        >
          {/* {formatDateHour(updatedEntry.createdAt)} */}
          {" - "}
          {/* {formatDateTitleTime(updatedEntry.createdAt)} */}
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
            {/* {updatedEntry.description} */}
          </Box>
        </Box>
        <Text color={textColorOne} fontFamily="Arial, sans-serif">
          {/* Likes: {updatedEntry.likes} */}
        </Text>
        <HStack
          // spacing={3}
          style={{
            display: "flex",
            padding: "0px 12px 0px 12px",
            width: "100%",
            justifyContent: "center",
          }}
        >
          <IconButton
            onClick={onOpen}
            icon={<EditIcon />}
            colorScheme="blue"
            style={{ width: "300px", height: "65px" }}
          />
        </HStack>
      </VStack>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent bg={colors.bgCard}>
          <ModalHeader
            fontFamily="Arial, sans-serif"
            color={colors.textPrimary}
            bg={colors.bgCard}
          >
            Update Profile
          </ModalHeader>
          <ModalCloseButton color={colors.textMuted} />
          <ModalBody
            className="min-w-[360px] max-w-[360px] mx-auto"
            bg={colors.bgCard}
          >
            <VStack spacing={4}>
              <Image
                src={userProfile.profileImage || profileColorMode}
                alt="Profile Picture"
                boxSize="150px"
                objectFit="cover"
                borderRadius="full"
              />
              <Text
                className="pt-0 pb-0 mb-0 mt-0 text-center font-weight-light"
                fontFamily="Arial, sans-serif"
                color={colors.textPrimary}
              >
                Avatar
              </Text>
              <Input
                className="form-control form-control-lg mb-2 mt-2 !w-[267px] !h-[47px] text-lg text-center font-weight-light hover:file:cursor-pointer hover:file:text-slate-600 content-center"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setUserProfile({
                      ...userProfile,
                      profileImage: reader.result,
                    });
                  };
                  if (file) {
                    reader.readAsDataURL(file);
                  }
                }}
                fontFamily="Arial, sans-serif"
                color={colors.textPrimary}
                borderColor={colors.borderColorInput}
              />

              <Text
                className="pt-0 pb-0 mb-0 mt-0 text-center font-weight-light"
                fontFamily="Arial, sans-serif"
                color={colors.textPrimary}
              >
                Name
              </Text>
              <Input
                className="form-control form-control-lg mb-2 mt-2 !w-[270px] text-center text-lg font-weight-light"
                placeholder={userProfile.name}
                name="name"
                // value={updatedEntry.name}
                onChange={(e) =>
                  setUpdatedEntry({ ...updatedEntry, name: e.target.value })
                }
                fontFamily="Arial, sans-serif"
                color={colors.textPrimary}
                borderColor={colors.borderColorInput}
                _placeholder={{ color: colors.textMuted }}
              />
              <Text
                className="pt-0 pb-0 mb-0 mt-0 text-center font-weight-light"
                fontFamily="Arial, sans-serif"
                color={colors.textPrimary}
              >
                Goal
              </Text>
              <Input
                className="form-control form-control-lg mb-2 mt-2 !w-[270px] text-center text-lg font-weight-light"
                placeholder={userProfile.goal}
                // style={{ height: "185px" }}
                name="description"
                // value={updatedEntry.description}
                onChange={(e) =>
                  setUpdatedEntry({
                    ...updatedEntry,
                    description: e.target.value,
                  })
                }
                fontFamily="Arial, sans-serif"
                color={colors.textPrimary}
                borderColor={colors.borderColorInput}
                _placeholder={{ color: colors.textMuted }}
              />
              <Text
                className="pt-0 pb-0 mb-0 mt-0 text-center font-weight-light"
                fontFamily="Arial, sans-serif"
                color={colors.textPrimary}
              >
                Bio
              </Text>
              <Textarea
                className="form-control form-control-lg mb-2 mt-2 !w-[270px] text-center text-lg font-weight-light"
                placeholder={userProfile.bio}
                name="image"
                // value={updatedEntry.image}
                onChange={(e) =>
                  setUpdatedEntry({
                    ...updatedEntry,
                    image: e.target.value,
                  })
                }
                fontFamily="Arial, sans-serif"
                color={colors.textPrimary}
                borderColor={colors.borderColorInput}
                _placeholder={{ color: colors.textMuted }}
              />
              <Text
                className="pt-0 pb-0 mb-0 mt-0 text-center font-weight-light"
                fontFamily="Arial, sans-serif"
                color={colors.textPrimary}
              >
                Gym
              </Text>
              <form className="!min-w-[10px] mx-auto">
                {/* <label
                  htmlFor="countries"
                  className="block mb-2 text-sm font-medium text-gray-900 dark:text-white text-center"
                >
                  Select an option
                </label> */}
                <select
                  id="countries"
                  className="!w-[263px] text-sm rounded-lg block p-2.5"
                  style={{
                    backgroundColor: colors.bgMuted,
                    borderColor: colors.borderColorInput,
                    color: colors.textPrimary,
                  }}
                >
                  <option selected>Select a location</option>
                  <option value="BL">Blink Fit</option>
                  <option value="PL">Planet Fitness</option>
                  <option value="RT">Retro Fitness</option>
                  <option value="HM">Home</option>
                </select>
              </form>
            </VStack>
          </ModalBody>
          <ModalFooter bg={colors.bgCard}>
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
              color={colors.textPrimary}
              _hover={{ bg: colors.bgHover }}
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ModifyProfile;
