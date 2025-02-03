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
  IconButton,
  Input,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Textarea,
  useColorModeValue,
} from "@chakra-ui/react";
import { Stack, Badge, Box, HStack, Icon, Image } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useProductStore } from "../store/product";
import ProductCard from "../components/ProductCard";
import { PlusSquareIcon } from "@chakra-ui/icons";
import light from "../assets/light.jpg";
import night from "../assets/night.jpg";
import { auth, googleProvider } from "../firebase";
import { getAuth, signInWithPopup } from "firebase/auth";

import { HiStar } from "react-icons/hi";
import PropTypes from "prop-types";

const ProfilePage = () => {
  // const { fetchEntrys, entrys, clearEntrys } = useProductStore();
  // const [updatedEntry, setUpdatedEntry] = useState(entry);
  const [isFileSelected, setIsFileSelected] = useState(false);
  const textColorDesc = useColorModeValue("gray.700", "gray.400");
  const profileColorMode = useColorModeValue(light, night);

  const [isSignedIn, setIsSignedIn] = useState(false);
  const [entries, setEntries] = useState([]);
  const [updatedProfile, setUpdatedProfile] = useState(null);
  const [userProfile, setUserProfile] = useState({
    name: "",
    goal: "",
    gymName: "",
    postsCount: 0,
    profileImage: "",
    bio: "",
  });
  const [profileImage, setProfileImage] = useState(null);
  const [uid, setUid] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  // const { updateProfile } = useProductStore();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();

  const toast = useToast();

  // const handleUpdateProfile = async (updatedProfile) => {
  //   console.log("handleUpdateProfile:", updatedProfile);
  //   const { success, message } = await updateProfile(updatedProfile);
  //   onClose();
  //   if (!success) {
  //     toast({
  //       title: "Error",
  //       description: message,
  //       status: "error",
  //       duration: 5000,
  //       isClosable: true,
  //     });
  //   } else {
  //     toast({
  //       title: "Success",
  //       description: "Product updated successfully",
  //       status: "success",
  //       duration: 5000,
  //       isClosable: true,
  //     });
  //   }
  // };

  useEffect(() => {
    if (!isSignedIn) {
      // fetchEntries();
      // clear feed
      setEntries([]);
    }
  }, [isSignedIn]);

  // Auth state listener
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUid(user.uid);
        fetchUserProfile(user);
        // console.log("User: token and UID::", user.accessToken, user.uid);
        // const token = await user.getIdToken();
        // console.log("Token:", token);
      } else {
        // console.error("User not authenticated");
        setUid(null);
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
  }, []);

  // Update user profile when entries change
  // useEffect(() => {
  //   if (uid && auth.currentUser) {
  //     fetchUserProfile(); // Remove parameters
  //   }
  // }, [entries, uid]);

  // Function to fetch user profile
  const fetchUserProfile = async (user) => {
    const token = await user.accessToken;
    const uid = user.uid;

    try {
      if (!token) {
        console.error("No authenticated token found");
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
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const data = await response.json();
      setUserProfile({
        name: data.data.name || "Anonymous",
        goal: data.data.goal || "Not set",
        gymName: data.data.gymName || "Not specified",
        postsCount: data.postsCount,
        bio: data.data.bio || "No bio available",
        profileImage:
          data.data.picture ||
          "https://johnjayathletics.com/images/logos/site/site.png",
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const [formData, setFormData] = useState({
    name: userProfile.name || "",
    goal: userProfile.goal || "",
    gymName: userProfile.gymName || "",
    bio: userProfile.bio || "",
  });

  // Update the handleInputChange function
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setProfileImage(file);
  };

  const handleUpdateProfile = async (updatedData) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      const token = await user.getIdToken();

      // Create FormData object
      const formData = new FormData();

      // Append only defined, non-empty values
      Object.entries(updatedData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          formData.append(key, value);
        }
      });

      // Append profile image ONLY if a new image is provided
      if (profileImage) {
        formData.append("profileImage", profileImage);
      } else {
        // Explicitly tell the backend to retain the existing image
        formData.append("retainImage", "true");
      }

      // Log FormData contents for debugging
      for (let pair of formData.entries()) {
        console.log(pair[0] + ": " + pair[1]);
      }

      const response = await fetch(
        "https://gym-tracker-brown.vercel.app/api/updateUserProfile",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            // Don't set Content-Type header - browser will set it automatically with boundary
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update profile");
      }

      const data = await response.json();

      // Update local state
      setUserProfile((prev) => ({
        ...prev,
        ...data.data,
      }));

      toast({
        title: "Success",
        description: "Profile updated successfully",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      onClose();
    } catch (error) {
      console.error("Profile update error:", error);
      toast({
        title: "Error",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // const handleUpdateProfile = async (updatedData) => {
  //   try {
  //     const auth = getAuth();
  //     const user = auth.currentUser;
  //     const token = await user.getIdToken();

  //     // Create FormData object
  //     const formData = new FormData();

  //     // Only append defined, non-empty values
  //     Object.entries(updatedData).forEach(([key, value]) => {
  //       if (value !== undefined && value !== null && value !== "") {
  //         formData.append(key, value);
  //       }
  //     });

  //     // Append profile image if it exists
  //     if (profileImage) {
  //       formData.append("profileImage", profileImage);
  //     }

  //     // Log FormData contents for debugging
  //     for (let pair of formData.entries()) {
  //       console.log(pair[0] + ": " + pair[1]);
  //     }

  //     const response = await fetch(
  //       "https://gym-tracker-brown.vercel.app/api/updateUserProfile",
  //       {
  //         method: "POST",
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //           // Don't set Content-Type header - browser will set it automatically with boundary
  //         },
  //         body: formData,
  //       }
  //     );

  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       throw new Error(errorData.message || "Failed to update profile");
  //     }

  //     const data = await response.json();

  //     // Update local state
  //     setUserProfile((prev) => ({
  //       ...prev,
  //       ...data.data,
  //     }));

  //     toast({
  //       title: "Success",
  //       description: "Profile updated successfully",
  //       status: "success",
  //       duration: 5000,
  //       isClosable: true,
  //     });
  //     onClose();
  //   } catch (error) {
  //     console.error("Profile update error:", error);
  //     toast({
  //       title: "Error",
  //       description: error.message,
  //       status: "error",
  //       duration: 5000,
  //       isClosable: true,
  //     });
  //   }
  // };

  // Update the handleUpdateProfile function
  // const handleUpdateProfile = async (updatedData) => {
  //   try {
  //     const auth = getAuth();
  //     const user = auth.currentUser;
  //     const token = await user.getIdToken();

  //     // Create FormData object
  //     const formData = new FormData();

  //     // Only append defined, non-empty values
  //     Object.entries(updatedData).forEach(([key, value]) => {
  //       if (value !== undefined && value !== null && value !== "") {
  //         formData.append(key, value);
  //       }
  //     });

  //     const response = await fetch(
  //       "https://gym-tracker-brown.vercel.app/api/updateUserProfile",
  //       {
  //         method: "POST",
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //           // Don't set Content-Type header - browser will set it automatically with boundary
  //         },
  //         body: formData,
  //       }
  //     );
  //     // console.log("response:", response);
  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       throw new Error(errorData.message || "Failed to update profile");
  //     }

  //     const data = await response.json();

  //     // Update local state
  //     setUserProfile((prev) => ({
  //       ...prev,
  //       ...data.data,
  //     }));

  //     toast({
  //       title: "Success",
  //       description: "Profile updated successfully",
  //       status: "success",
  //       duration: 5000,
  //       isClosable: true,
  //     });
  //     onClose();
  //   } catch (error) {
  //     console.error("Profile update error:", error);
  //     toast({
  //       title: "Error",
  //       description: error.message,
  //       status: "error",
  //       duration: 5000,
  //       isClosable: true,
  //     });
  //   }
  // };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const auth = getAuth();
    const user = auth.currentUser;
    const token = await user.getIdToken();

    const formDataObj = new FormData();
    formDataObj.append("name", formData.name);
    formDataObj.append("goal", formData.goal);
    formDataObj.append("gymName", formData.gymName);
    formDataObj.append("bio", formData.bio);

    if (profileImage) {
      formDataObj.append("profileImage", profileImage);
    }

    const result = await updateProfile(formDataObj);
    if (!result.success) {
      toast({
        title: "Error",
        description: result.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } else {
      toast({
        title: "Success",
        description: result.message,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      onClose();
    }
  };

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        if (!uid) {
          console.error("UID is not set");
          return;
        }
        const user = auth.currentUser;
        if (!user) {
          console.error("User not authenticated");
          return;
        }
        const token = await user.getIdToken();
        const response = await fetch(
          `https://gym-tracker-brown.vercel.app/api/posts/${uid}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();
        // console.log("Posts data:", data);
        if (data.success) {
          setEntries(data.data);
        } else {
          console.error("Failed to fetch posts:", data.message);
        }
      } catch (error) {
        console.error("Error fetching posts:", error);
      }
    };

    if (uid) {
      fetchPosts();
    }
  }, [uid]);

  return (
    <Container
      maxW="container.xl"
      className="text-center"
      py={12}
      style={{
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SimpleGrid
        columns={{
          base: 1,
          md: 1,
          lg: 1,
        }}
        spacing={1}
        w={"sm"}
        style={{
          placeItems: "center",
          backgroundImage: "url(https://picsum.photos/380/200)",
          justifyContent: "center",
          alignSelf: "center",
          height: "200px",
          inlineSize: "-webkit-fill-available",
        }}
      ></SimpleGrid>
      <SimpleGrid
        columns={{
          base: 1,
          md: 1,
          lg: 1,
        }}
        spacing={10}
        w={"sm"}
        style={{
          placeItems: "center",
          justifyContent: "center",
          alignSelf: "center",
          position: "absolute",
          borderRadius: "42px",
          backgroundColor: "#32323285",
          backdropFilter: "blur(4px)",
        }}
      >
        <Stack
          direction="row"
          w={"sm"}
          borderWidth="1px"
          gap="0"
          className="content-center flex-wrap flex-row"
          style={{ justifyContent: "center", borderRadius: "39px" }}
        >
          <Image
            src={userProfile.profileImage || profileColorMode}
            boxSize="150px"
            borderRadius="full"
            fit="cover"
            alt={userProfile.name}
            style={{ placeSelf: "center", padding: "10px 10px" }}
          />

          <Box
            p="4"
            spacey="0"
            style={{ display: "block", alignContent: "center" }}
          >
            <HStack direction="row">
              <VStack>
                <HStack>
                  <VStack>
                    {/* <button
                      // getCurrentMongoDBUser
                      onClick={async () => {
                        const auth = getAuth();
                        const user = auth.currentUser;
                        const token = await user.getIdToken();
                        const response = await fetch(
                          "http://localhost:5001/api/getCurrentMongoDBUser",
                          {
                            method: "GET",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                          }
                        );
                        const data = await response.json();
                        console.log("Current MongoDB User:", data);
                      }}
                    >
                      Get Current MongoDB User
                    </button> */}
                    <Text fontSize="xl" fontWeight="bold" color="white">
                      {userProfile.name}
                    </Text>
                    <Badge colorScheme="teal" variant="solid">
                      {userProfile.goal}
                    </Badge>
                  </VStack>
                  <VStack>
                    <Text fontSize="xl" fontWeight="bold" color="white">
                      {userProfile.postsCount}
                    </Text>
                    <Badge colorScheme="teal" variant="solid">
                      Posts
                    </Badge>
                  </VStack>
                  <VStack>
                    <Text fontSize="xl" fontWeight="bold" color="white">
                      {userProfile.gymName}
                    </Text>
                    <Badge colorScheme="teal" variant="solid">
                      Gym
                    </Badge>
                  </VStack>
                </HStack>
                <HStack gap="1" fontWeight="medium">
                  <Text maxWidth="600px" color="white">
                    {userProfile.bio}
                  </Text>
                </HStack>
                <IconButton
                  onClick={onOpen}
                  icon={<EditIcon />}
                  colorScheme="blue"
                  style={{ width: "200px", height: "45px" }}
                />
              </VStack>
            </HStack>
          </Box>
        </Stack>
      </SimpleGrid>
      <Modal isOpen={isOpen} onClose={onClose}>
        <form onSubmit={handleSubmit}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader fontFamily="Arial, sans-serif">
              Update Entry
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <Image
                  src={
                    userProfile.profileImage || "default-profile-picture-url"
                  }
                  alt="Profile Picture"
                  boxSize="150px"
                  objectFit="cover"
                  borderRadius="full"
                />
                <Text
                  className="pt-0 pb-0 mb-0 mt-0 text-center font-weight-light"
                  fontFamily="Arial, sans-serif"
                  color={textColorDesc}
                >
                  Avatar
                </Text>
                <Input
                  className="form-control form-control-lg mb-2 mt-2 !w-[267px] !h-[47px] text-lg text-center font-weight-light hover:file:cursor-pointer hover:file:text-slate-600 content-center"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setUserProfile({
                          ...userProfile,
                          profileImage: reader.result,
                          profileImageName: file.name,
                        });
                      };
                      reader.readAsDataURL(file);
                      setIsFileSelected(true); // Set file selection state to true
                    } else {
                      setIsFileSelected(false); // Set file selection state to false
                    }
                  }}
                  //   const file = e.target.files[0];
                  //   const reader = new FileReader();
                  //   reader.onloadend = () => {
                  //     setUserProfile({
                  //       ...userProfile,
                  //       profileImage: reader.result,
                  //       profileImageName: file.name,
                  //     });
                  //     // console buffer of image
                  //     // console.log("File buffer:", reader.result);
                  //   };
                  //   if (file) {
                  //     reader.readAsDataURL(file);
                  //   }
                  // }}
                  fontFamily="Arial, sans-serif"
                />
                <Text
                  className="pt-0 pb-0 mb-0 mt-0 text-center font-weight-light"
                  fontFamily="Arial, sans-serif"
                  color={textColorDesc}
                >
                  Name
                </Text>
                <Input
                  className="form-control form-control-lg mb-2 mt-2 !w-[270px] text-center text-lg font-weight-light"
                  fontFamily="Arial, sans-serif"
                  type="text"
                  name="name"
                  // placeholder={userProfile.name}
                  defaultValue={userProfile.name}
                  // onChange={handleInputChange}
                  onChange={(e) => {
                    setUserProfile({
                      ...userProfile,
                      name: e.target.value,
                    });
                  }}
                />
                <Text
                  className="pt-0 pb-0 mb-0 mt-0 text-center font-weight-light"
                  fontFamily="Arial, sans-serif"
                  color={textColorDesc}
                >
                  Goal
                </Text>
                <Input
                  className="form-control form-control-lg mb-2 mt-2 !w-[270px] text-center text-lg font-weight-light"
                  fontFamily="Arial, sans-serif"
                  type="text"
                  name="goal"
                  placeholder={userProfile.goal}
                  defaultValue={userProfile.goal}
                  onChange={(e) => {
                    setUserProfile({
                      ...userProfile,
                      goal: e.target.value,
                    });
                  }}
                />
                <Text
                  className="pt-0 pb-0 mb-0 mt-0 text-center font-weight-light"
                  fontFamily="Arial, sans-serif"
                  color={textColorDesc}
                >
                  Bio
                </Text>
                <Textarea
                  className="form-control form-control-lg mb-2 mt-2 !w-[270px] text-center text-lg font-weight-light"
                  placeholder={userProfile.bio}
                  defaultValue={userProfile.bio}
                  name="bio"
                  onChange={(e) => {
                    setUserProfile({
                      ...userProfile,
                      bio: e.target.value,
                    });
                  }}
                  fontFamily="Arial, sans-serif"
                />
                <Text
                  className="pt-0 pb-0 mb-0 mt-0 text-center font-weight-light"
                  fontFamily="Arial, sans-serif"
                  color={textColorDesc}
                >
                  Gym
                </Text>
                {/* <form className="!min-w-[10px] mx-auto"> */}
                <select
                  id="selectedOption"
                  defaultValue={userProfile.gymName}
                  onChange={(e) => {
                    setUserProfile({
                      ...userProfile,
                      gymName: e.target.value,
                    });
                  }}
                  color={textColorDesc}
                  className="!w-[263px] bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-300 focus:border-blue-300 block p-2.5 dark:bg-inherit dark:border-gray-300 dark:placeholder-gray-400 dark:text-gray-500 dark:focus:ring-blue-500 dark:focus:border-blue-500 "
                >
                  <option>Select a location</option>
                  <option value="Blink Fitness">Blink Fitness</option>
                  <option value="Planet Fitness">Planet Fitness</option>
                  <option value="Retro Fitness">Retro Fitness</option>
                  <option value="Home">Home</option>
                </select>
                {/* </form> */}
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button
                // type="submit"
                colorScheme="blue"
                mr={3}
                // onClick={() => handleUpdateProfile(userProfile)}
                onClick={() => {
                  // console.log("Updated Profile Data:", userProfile);
                  handleUpdateProfile(userProfile);
                }}
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
        </form>
      </Modal>
      <VStack spacing={8} mt={10}>
        <Text
          fontSize={"22"}
          fontWeight={"bold"}
          bgGradient={"linear(to-r, blue.200, gray.400)"}
          bgClip={"text"}
          textAlign={"center"}
        >
          Workout Entries
        </Text>

        <SimpleGrid
          columns={{
            base: 1,
            md: 2,
            lg: 3,
          }}
          spacing={10}
          w={"full"}
        >
          {[...entries].reverse().map((entry) => (
            <ProductCard key={entry._id} entry={entry} />
          ))}
        </SimpleGrid>

        {entries.length === 0 && (
          <Text
            fontSize="xl"
            textAlign={"center"}
            fontWeight="bold"
            color="gray.500"
          >
            No entries found 😢{" "}
            <Link to={"/create"}>
              <Text
                as="span"
                color="blue.500"
                _hover={{ textDecoration: "underline" }}
              >
                Create an entry
              </Text>
            </Link>
          </Text>
        )}
      </VStack>
    </Container>
  );
};
// ProfilePage.propTypes = {
//   entry: PropTypes.shape({
//     id: PropTypes.string.isRequired,
//   }).isRequired,
// };

export default ProfilePage;
