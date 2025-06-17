import {
  Container,
  SimpleGrid,
  Text,
  VStack,
  Button,
  Box,
  Spinner,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useProductStore } from "../store/product";
import ProductCard from "../components/ProductCard";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup } from "firebase/auth";
import { Hero } from "../components/Hero";
import { SlArrowRight, SlArrowLeft } from "react-icons/sl";

const HomePage = () => {
  const { clearEntrys, updateEntry } = useProductStore();
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
  const [followingUids, setFollowingUids] = useState([]);
  const toast = useToast();
  const spinnerColor = useColorModeValue("gray.700", "gray.400");

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Handle auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsSignedIn(true);
        setUid(user.uid);
        useProductStore.getState().setCurrentUser(user);
      } else {
        setIsSignedIn(false);
        setUid(null);
        setEntries([]);
        setFollowingUids([]);
        clearEntrys();
        useProductStore.getState().setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [clearEntrys]);

  // Fetch following UIDs
  useEffect(() => {
    const fetchFollowing = async () => {
      if (!uid) return;
      try {
        const user = auth.currentUser;
        const token = await user.getIdToken();
        const response = await fetch(
          `http://localhost:5001/api/users/${uid}/following`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const data = await response.json();
        console.log("Following API response:", data); // Debug
        if (data.success) {
          const uids = data.data.map((user) => user.uid);
          setFollowingUids(uids);
          console.log("Following UIDs:", uids); // Debug
        } else {
          throw new Error(data.message || "Failed to fetch following");
        }
      } catch (error) {
        console.error("Error fetching following UIDs:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to load followed users",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    };

    if (uid) {
      fetchFollowing();
    }
  }, [uid, toast]);

  // Fetch posts for following feed
  useEffect(() => {
    const fetchFeedPosts = async () => {
      try {
        setIsLoading(true);
        if (!uid) {
          setEntries([]);
          setPagination({
            currentPage: 1,
            totalPages: 0,
            totalPosts: 0,
            limit,
          });
          return;
        }

        const user = auth.currentUser;
        const token = await user.getIdToken();
        let allPosts = [];
        const uidsToFetch = [...new Set([uid, ...followingUids])]; // Include own UID
        console.log("Fetching posts for UIDs:", uidsToFetch); // Debug

        // Fallback: Fetch posts for each UID individually
        for (const fetchUid of uidsToFetch) {
          const response = await fetch(
            `http://localhost:5001/api/posts/${fetchUid}?page=${currentPage}&limit=${limit}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );
          const data = await response.json();
          console.log(`Posts for UID ${fetchUid}:`, data); // Debug
          if (data.success) {
            const normalizedPosts = data.data.map((post) => ({
              _id: post._id,
              name: post.name || "Untitled",
              description: post.description || "No description",
              image: post.image || null,
              likes: post.likes || 0,
              comments: Array.isArray(post.comments) ? post.comments : [],
              createdAt: post.createdAt || new Date().toISOString(),
              ownerId: post.ownerId || fetchUid,
            }));
            allPosts = [...allPosts, ...normalizedPosts];
          }
        }

        // Sort by createdAt (newest first) and apply pagination
        allPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const totalPosts = allPosts.length;
        const totalPages = Math.ceil(totalPosts / limit);
        const paginatedPosts = allPosts.slice(0, limit); // Simplified for first page

        setEntries(paginatedPosts);
        setPagination({
          currentPage,
          totalPages: totalPages || 1,
          totalPosts,
          limit,
        });

        if (allPosts.length === 0) {
          console.log("No posts found for feed"); // Debug
        }
      } catch (error) {
        console.error("Error fetching feed posts:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to load feed",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (uid) {
      fetchFeedPosts();
    }
  }, [uid, followingUids, currentPage, limit, toast]);

  const handleUpdateEntry = async (pid, updatedEntry) => {
    const previousEntries = [...entries];
    const updatedEntries = entries.map((entry) =>
      entry._id === pid ? { ...entry, ...updatedEntry } : entry
    );
    setEntries(updatedEntries);

    try {
      const { success, message, data } = await updateEntry(pid, updatedEntry);
      if (!success) {
        setEntries(previousEntries);
        console.error("Failed to update entry:", message);
        toast({
          title: "Error",
          description: message || "Failed to update post",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
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
      toast({
        title: "Error",
        description: error.message || "Failed to update post",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      const response = await fetch(`http://localhost:5001/api/protected`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const userData = await response.json();
      console.log("User Data:", userData.uid);
      const currentUserResponse = await fetch(
        `http://localhost:5001/api/getCurrentUser`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!currentUserResponse.ok) {
        throw new Error(await currentUserResponse.text());
      }
      const currentUserData = await currentUserResponse.json();
      console.log("Logged in as:", currentUserData);
    } catch (error) {
      console.error("Error during sign-in:", error);
      handleSignOutUser();
      toast({
        title: "Error",
        description: error.message || "Failed to sign in",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSignOutUser = async () => {
    try {
      await auth.signOut();
      console.log("Signed out");
      setUid(null);
      setIsSignedIn(false);
      setEntries([]);
      setFollowingUids([]);
    } catch (error) {
      console.error("Error during sign-out:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to sign out",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Container maxW="container.xl" className="text-center z-0 relative">
      {isSignedIn ? (
        <>
          <VStack spacing={8} className="pt-[112px]">
            <Text
              fontSize={"22"}
              fontWeight={"bold"}
              bgGradient={"linear(to-r, blue.200, gray.400)"}
              bgClip={"text"}
              textAlign={"center"}
            >
              Following Feed
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
                  color={spinnerColor}
                />
              </Box>
            ) : (
              <>
                <SimpleGrid
                  columns={{
                    base: 1,
                    md: 2,
                    lg: 3,
                  }}
                  spacing={10}
                  w={"full"}
                >
                  {entries.map((entry) => (
                    <ProductCard
                      key={entry._id}
                      entry={entry}
                      isOwner={auth.currentUser?.uid === entry.ownerId}
                      onUpdate={handleUpdateEntry}
                    />
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
                    isDisabled={
                      currentPage === 1 || pagination.totalPages === 0
                    }
                    mr={2}
                  >
                    <SlArrowLeft />
                  </Button>
                  <Text mx={2}>
                    {pagination.totalPages === 0
                      ? "0 • 0"
                      : `${currentPage} • ${pagination.totalPages}`}
                  </Text>
                  <Button
                    onClick={() => handlePageChange(currentPage + 1)}
                    isDisabled={
                      currentPage === pagination.totalPages ||
                      pagination.totalPages === 0
                    }
                    ml={2}
                  >
                    <SlArrowRight />
                  </Button>
                </Box>
                {entries.length === 0 && (
                  <Text
                    fontSize="xl"
                    textAlign={"center"}
                    fontWeight="bold"
                    color="gray.500"
                  >
                    No posts to show 😢{" "}
                    <Link to={"/profile"}>
                      <Text
                        as="span"
                        color="blue.500"
                        _hover={{ textDecoration: "underline" }}
                      >
                        Follow some users
                      </Text>
                    </Link>{" "}
                    or{" "}
                    <Link to={"/create"}>
                      <Text
                        as="span"
                        color="blue.500"
                        _hover={{ textDecoration: "underline" }}
                      >
                        create a post
                      </Text>
                    </Link>
                  </Text>
                )}
              </>
            )}
          </VStack>
        </>
      ) : (
        <div>
          <Hero />
        </div>
      )}
    </Container>
  );
};

export default HomePage;

// import { EditIcon } from "@chakra-ui/icons";
// import {
//   useDisclosure,
//   useToast,
//   Container,
//   SimpleGrid,
//   Text,
//   VStack,
//   Button,
//   Modal,
//   ModalBody,
//   ModalCloseButton,
//   Input,
//   ModalContent,
//   ModalFooter,
//   ModalHeader,
//   ModalOverlay,
//   Textarea,
//   useColorModeValue,
//   Heading,
//   Avatar,
//   Center,
//   Flex,
//   Spinner,
// } from "@chakra-ui/react";
// import { Stack, Box, Image } from "@chakra-ui/react";
// import { useEffect, useState } from "react";
// import { Link } from "react-router-dom";
// import { useProductStore } from "../store/product";
// import ProductCard from "../components/ProductCard";
// import { FileUploader } from "../components/FileUploader";
// import light from "../assets/light.jpg";
// import night from "../assets/night.jpg";
// import { auth } from "../firebase";
// import { getAuth } from "firebase/auth";
// import { SlArrowRight, SlArrowLeft } from "react-icons/sl";
// import defaultBg from "../assets/defaultBg.jpg";
// import defaultBgNight from "../assets/defaultBgNight.jpg";

// const ProfilePage = () => {
//   const [isSignedIn, setIsSignedIn] = useState(false);
//   const [entries, setEntries] = useState([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [userProfile, setUserProfile] = useState({
//     name: "",
//     goal: "",
//     gymName: "",
//     postsCount: 0,
//     profileImage: "",
//     backgroundPicture: "",
//     bio: "",
//     followers: 0,
//     following: 0,
//   });
//   const [profileImage, setProfileImage] = useState(null);
//   const [backgroundImage, setBackgroundImage] = useState(null);
//   const [uid, setUid] = useState(null);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [limit] = useState(6);
//   const [pagination, setPagination] = useState({
//     currentPage: 1,
//     totalPages: 1,
//     totalPosts: 0,
//     limit: 6,
//   });
//   const [allUsers, setAllUsers] = useState([]);
//   const [isLoadingUsers, setIsLoadingUsers] = useState(false);
//   const [followingStatus, setFollowingStatus] = useState({});
//   const [loadingStates, setLoadingStates] = useState({});

//   const textColorDesc = useColorModeValue("gray.700", "gray.400");
//   const bgColor = useColorModeValue("white", "gray.800");
//   const colorEditButton = useColorModeValue("gray.400", "gray.900");
//   const profileColorMode = useColorModeValue(light, night);
//   const bgColorMode = useColorModeValue(defaultBg, defaultBgNight);
//   const {
//     isOpen: isProfileOpen,
//     onOpen: onProfileOpen,
//     onClose: onProfileClose,
//   } = useDisclosure();
//   const {
//     isOpen: isBackgroundOpen,
//     onOpen: onBackgroundOpen,
//     onClose: onBackgroundClose,
//   } = useDisclosure();
//   const toast = useToast();
//   const { fetchEntrys, entrys, clearEntrys } = useProductStore();

//   const [isFollowersOpen, setIsFollowersOpen] = useState(false);
//   const [isFollowingOpen, setIsFollowingOpen] = useState(false);
//   const [followersList, setFollowersList] = useState([]);
//   const [followingList, setFollowingList] = useState([]);
//   const [isFollowingLoading, setIsFollowingLoading] = useState(false);

//   const auth = getAuth();

//   useEffect(() => {
//     const auth = getAuth();
//     const unsubscribe = auth.onAuthStateChanged((user) => {
//       if (user) {
//         setUid(user.uid);
//         setIsSignedIn(true);
//         fetchUserProfile(user);
//       } else {
//         setUid(null);
//         setIsSignedIn(false);
//         setEntries([]);
//         setUserProfile({
//           name: "",
//           goal: "",
//           gymName: "",
//           postsCount: 0,
//           profileImage: "",
//           backgroundPicture: "",
//           bio: "",
//         });
//         clearEntrys();
//       }
//       setIsLoading(false);
//     });
//     return () => unsubscribe();
//   }, [clearEntrys]);

//   const handleProfileImageUpload = (file) => {
//     if (file) {
//       setProfileImage(file);
//       const reader = new FileReader();
//       reader.onloadend = () => {
//         setUserProfile((prev) => ({
//           ...prev,
//           profileImage: reader.result,
//         }));
//       };
//       reader.readAsDataURL(file);
//     }
//   };

//   const handleBackgroundImageUpload = (file) => {
//     if (file) {
//       setBackgroundImage(file);
//       const reader = new FileReader();
//       reader.onloadend = () => {
//         setUserProfile((prev) => ({
//           ...prev,
//           backgroundPicture: reader.result,
//         }));
//       };
//       reader.readAsDataURL(file);
//     }
//   };

//   const fetchUserProfile = async (user) => {
//     try {
//       const token = await user.getIdToken();
//       const response = await fetch(
//         `http://localhost:5001/api/getUserProfile/${user.uid}`,
//         {
//           method: "GET",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${token}`,
//           },
//         }
//       );

//       if (!response.ok) throw new Error(await response.text());

//       const data = await response.json();
//       // console.log(data.data);
//       setUserProfile({
//         name: data.data.user.name || "Name",
//         goal: data.data.user.goal || "Not set…",
//         gymName: data.data.user.gymName || "Not specified",
//         postsCount: data.data.postsCount || 0,
//         bio: data.data.user.bio || "No bio available",
//         profileImage: data.data.user.picture || profileColorMode,
//         backgroundPicture: data.data.user.backgroundPicture || bgColorMode,
//         followers: Array.isArray(data.data.user.followers)
//           ? data.data.user.followers.length
//           : 0,
//         following: Array.isArray(data.data.user.following)
//           ? data.data.user.following.length
//           : 0,
//       });
//     } catch (error) {
//       console.error("Error fetching user profile:", error);
//       toast({
//         title: "Error",
//         description: error.message,
//         status: "error",
//         duration: 5000,
//         isClosable: true,
//       });
//     }
//   };

//   const handleProfileSubmit = async (e) => {
//     e.preventDefault();
//     const auth = getAuth();
//     const user = auth.currentUser;
//     const token = await user.getIdToken();

//     try {
//       const profileFormData = new FormData();
//       profileFormData.append("name", userProfile.name);
//       profileFormData.append("goal", userProfile.goal);
//       profileFormData.append("gymName", userProfile.gymName);
//       profileFormData.append("bio", userProfile.bio);
//       if (profileImage) {
//         profileFormData.append("profileImage", profileImage);
//         profileFormData.append("profileImageName", profileImage.name);
//       }

//       const profileResponse = await fetch(
//         "https://gym-tracker-brown.vercel.app/api/updateUserProfile",
//         {
//           method: "POST",
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//           body: profileFormData,
//         }
//       );

//       if (!profileResponse.ok) {
//         const errorData = await profileResponse.json();
//         throw new Error(errorData.message || "Failed to update profile");
//       }

//       const profileData = await profileResponse.json();
//       setUserProfile((prev) => ({
//         ...prev,
//         ...profileData.data,
//       }));

//       toast({
//         title: "Success",
//         description: "Profile updated successfully",
//         status: "success",
//         duration: 5000,
//         isClosable: true,
//       });
//       setProfileImage(null);
//       onProfileClose();
//     } catch (error) {
//       toast({
//         title: "Error",
//         description: error.message || "Failed to update profile",
//         status: "error",
//         duration: 5000,
//         isClosable: true,
//       });
//     }
//   };

//   const handleBackgroundSubmit = async (e) => {
//     e.preventDefault();
//     const auth = getAuth();
//     const user = auth.currentUser;
//     const token = await user.getIdToken();

//     try {
//       if (!backgroundImage) {
//         throw new Error("No background image selected");
//       }

//       const backgroundFormData = new FormData();
//       backgroundFormData.append("backgroundPicture", backgroundImage);
//       backgroundFormData.append("backgroundPictureName", backgroundImage.name);

//       const backgroundResponse = await fetch(
//         "https://gym-tracker-brown.vercel.app/api/updateUserBackgroundPicture",
//         {
//           method: "POST",
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//           body: backgroundFormData,
//         }
//       );

//       if (!backgroundResponse.ok) {
//         const errorData = await backgroundResponse.json();
//         throw new Error(
//           errorData.message || "Failed to update background picture"
//         );
//       }

//       const backgroundData = await backgroundResponse.json();
//       setUserProfile((prev) => ({
//         ...prev,
//         backgroundPicture: backgroundData.data.backgroundPicture,
//       }));

//       toast({
//         title: "Success",
//         description: "Background picture updated successfully",
//         status: "success",
//         duration: 5000,
//         isClosable: true,
//       });
//       setBackgroundImage(null);
//       onBackgroundClose();
//     } catch (error) {
//       toast({
//         title: "Error",
//         description: error.message || "Failed to update background picture",
//         status: "error",
//         duration: 5000,
//         isClosable: true,
//       });
//     }
//   };

//   useEffect(() => {
//     const fetchPosts = async () => {
//       try {
//         setIsLoading(true);
//         if (!uid) return;

//         const user = auth.currentUser;
//         const token = await user.getIdToken();
//         const response = await fetch(
//           `https://gym-tracker-brown.vercel.app/api/posts/${uid}?page=${currentPage}&limit=${limit}`,
//           {
//             method: "GET",
//             headers: {
//               "Content-Type": "application/json",
//               Authorization: `Bearer ${token}`,
//             },
//           }
//         );

//         const data = await response.json();
//         if (data.success) {
//           // Normalize posts to ensure ownerId is included
//           const normalizedEntries = data.data.map((post) => ({
//             _id: post._id,
//             name: post.name || "Untitled",
//             description: post.description || "No description",
//             image: post.image || null,
//             likes: post.likes || 0,
//             comments: Array.isArray(post.comments) ? post.comments : [],
//             createdAt: post.createdAt || new Date().toISOString(),
//             ownerId: post.ownerId || uid, // Ensure ownerId is set
//           }));
//           setEntries(normalizedEntries);
//           setPagination(data.pagination);
//         }
//       } catch (error) {
//         console.error("Error fetching posts:", error);
//         toast({
//           title: "Error",
//           description: error.message || "Failed to load posts",
//           status: "error",
//           duration: 5000,
//           isClosable: true,
//         });
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     if (uid) fetchPosts();
//   }, [uid, currentPage, limit, auth.currentUser]);

//   const handlePageChange = (newPage) => {
//     setCurrentPage(newPage);
//   };

//   const totalPages = pagination.totalPages;

//   // Get followers list
//   const getFollowers = async (userId) => {
//     console.log("get followers");
//     try {
//       const user = auth.currentUser;
//       if (!user) throw new Error("User not authenticated");
//       const token = await user.getIdToken();
//       const response = await fetch(
//         `http://localhost:5001/api/users/${userId}/followers`,
//         {
//           method: "GET",
//           headers: {
//             Authorization: `Bearer ${token}`,
//             "Content-Type": "application/json",
//           },
//         }
//       );
//       if (!response.ok) throw new Error("Failed to fetch followers");
//       const data = await response.json();
//       // console.log("Followers response:", data.data); // Debug
//       // return data.data || [];
//       console.log("Followers data:", data); // Debug the response
//       // Ensure data.data is an array; adjust if the API returns a different structure
//       return Array.isArray(data.data) ? data.data : [];
//     } catch (error) {
//       console.error("Error fetching followers:", error);
//       toast({
//         title: "Error",
//         description: error.message,
//         status: "error",
//         duration: 5000,
//         isClosable: true,
//       });
//       return [];
//     }
//   };
//   // const getFollowers = async (userId) => {
//   //   try {
//   //     const user = auth.currentUser;
//   //     if (!user) throw new Error("User not authenticated");

//   //     const token = await user.getIdToken();
//   //     const response = await fetch(
//   //       `http://localhost:5001/api/users/${userId}/followers`,
//   //       {
//   //         method: "GET",
//   //         headers: {
//   //           Authorization: `Bearer ${token}`,
//   //           "Content-Type": "application/json",
//   //         },
//   //       }
//   //     );
//   //     if (!response.ok) throw new Error("Failed to fetch followers");
//   //     const data = await response.json();
//   //     return data.data || [];
//   //   } catch (error) {
//   //     console.error("Error fetching followers:", error);
//   //     toast({
//   //       title: "Error",
//   //       description: error.message,
//   //       status: "error",
//   //       duration: 5000,
//   //       isClosable: true,
//   //     });
//   //     return [];
//   //   }
//   // };

//   // Get following list
//   const getFollowing = async (userId) => {
//     try {
//       const user = auth.currentUser;
//       if (!user) throw new Error("User not authenticated");

//       const token = await user.getIdToken();
//       const response = await fetch(
//         `http://localhost:5001/api/users/${userId}/following`,
//         {
//           method: "GET",
//           headers: {
//             Authorization: `Bearer ${token}`,
//             "Content-Type": "application/json",
//           },
//         }
//       );
//       console.log(response);
//       if (!response.ok) throw new Error("Failed to fetch following");

//       const data = await response.json();
//       console.log("Following data:", data); // Debug to confirm structure
//       // return data.data || [];
//       return Array.isArray(data.data) ? data.data : [];
//     } catch (error) {
//       console.error("Error fetching following:", error);
//       toast({
//         title: "Error",
//         description: error.message,
//         status: "error",
//         duration: 5000,
//         isClosable: true,
//       });
//       return [];
//     }
//   };

//   const handleFollow = async (userIdToFollow) => {
//     try {
//       setLoadingStates((prev) => ({ ...prev, [userIdToFollow]: true }));
//       const user = auth.currentUser;
//       if (!user) throw new Error("You need to sign in to follow users");

//       const token = await user.getIdToken();
//       const isCurrentlyFollowing = followingStatus[userIdToFollow];
//       const endpoint = isCurrentlyFollowing ? "unfollow" : "follow";

//       const response = await fetch(
//         `http://localhost:5001/api/${endpoint}/${userIdToFollow}`,
//         {
//           method: "POST",
//           headers: {
//             Authorization: `Bearer ${token}`,
//             "Content-Type": "application/json",
//           },
//         }
//       );

//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.message || `Failed to ${endpoint} user`);
//       }

//       const data = await response.json();

//       if (data.message === "Followed successfully") {
//         setFollowingStatus((prev) => ({ ...prev, [userIdToFollow]: true }));
//         setUserProfile((prev) => ({
//           ...prev,
//           followers: isFollowersOpen ? prev.followers : prev.followers + 1,
//         }));
//         toast({
//           title: "Success",
//           description: `You are now following ${
//             data.data?.followedUser?.name || "this user"
//           }`,
//           status: "success",
//           duration: 5000,
//           isClosable: true,
//         });
//       } else if (data.message === "Already following") {
//         setFollowingStatus((prev) => ({ ...prev, [userIdToFollow]: true }));
//         toast({
//           title: "Info",
//           description: `You are already following ${
//             data.data?.followedUser?.name || "this user"
//           }`,
//           status: "info",
//           duration: 5000,
//           isClosable: true,
//         });
//       } else if (data.message === "Unfollowed successfully") {
//         setFollowingStatus((prev) => ({ ...prev, [userIdToFollow]: false }));
//         setUserProfile((prev) => ({
//           ...prev,
//           followers: isFollowersOpen ? prev.followers : prev.followers - 1,
//         }));
//         toast({
//           title: "Success",
//           description: `You have unfollowed ${
//             data.data?.unfollowedUser?.name || "this user"
//           }`,
//           status: "success",
//           duration: 5000,
//           isClosable: true,
//         });
//       } else if (data.message === "Not following") {
//         setFollowingStatus((prev) => ({ ...prev, [userIdToFollow]: false }));
//         toast({
//           title: "Info",
//           description: `You are not following ${
//             data.data?.unfollowedUser?.name || "this user"
//           }`,
//           status: "info",
//           duration: 5000,
//           isClosable: true,
//         });
//       } else {
//         console.warn("Unexpected API response:", data);
//         toast({
//           title: "Warning",
//           description: "Unexpected response from server",
//           status: "warning",
//           duration: 5000,
//           isClosable: true,
//         });
//       }

//       if (isFollowersOpen) {
//         const followers = await getFollowers(uid);
//         setFollowersList(followers);
//       }
//       if (isFollowingOpen) {
//         const following = await getFollowing(uid);
//         setFollowingList(following);
//       }

//       const updatedUser = auth.currentUser;
//       if (updatedUser) {
//         fetchUserProfile(updatedUser);
//       }

//       return true;
//     } catch (error) {
//       console.error(
//         `Error ${
//           followingStatus[userIdToFollow] ? "unfollowing" : "following"
//         } user:`,
//         error
//       );
//       toast({
//         title: "Error",
//         description:
//           error.message ||
//           `Failed to ${
//             followingStatus[userIdToFollow] ? "unfollow" : "follow"
//           } user`,
//         status: "error",
//         duration: 5000,
//         isClosable: true,
//       });
//       return false;
//     } finally {
//       setLoadingStates((prev) => ({ ...prev, [userIdToFollow]: false }));
//     }
//   };

//   useEffect(() => {
//     const initializeFollowingStatus = async () => {
//       try {
//         const user = auth.currentUser;
//         if (!user) return;

//         const token = await user.getIdToken();
//         const response = await fetch(
//           `http://localhost:5001/api/users/${user.uid}/following`,
//           {
//             method: "GET",
//             headers: {
//               Authorization: `Bearer ${token}`,
//               "Content-Type": "application/json",
//             },
//           }
//         );
//         // console.log(response);
//         if (!response.ok) return;

//         const data = await response.json();
//         // console.log("Initialize following data:", data); // Debug
//         if (data.success && data.data) {
//           const followingMap = {};
//           data.data.forEach((user) => {
//             followingMap[user.uid] = true;
//           });
//           setFollowingStatus(followingMap);
//         }
//       } catch (error) {
//         console.error("Error initializing following status:", error);
//       }
//     };

//     if (isSignedIn) {
//       initializeFollowingStatus();
//     }
//   }, [isSignedIn]);

//   return (
//     <Container maxW="container.xl" py={12}>
//       <Center py={6} mt={10}>
//         <Box
//           maxW={"580px"}
//           w={"full"}
//           bg={bgColor}
//           boxShadow={"2xl"}
//           rounded={"md"}
//           overflow={"hidden"}
//         >
//           <Box position="relative">
//             <Image
//               h={"120px"}
//               w={"full"}
//               src={isLoading ? bgColorMode : userProfile.backgroundPicture}
//               fallbackSrc={bgColorMode}
//               objectFit="cover"
//               alt="Background"
//             />

//             <Button
//               onClick={onBackgroundOpen}
//               size="sm"
//               colorScheme="blue"
//               bg={colorEditButton}
//               color={"white"}
//               position="absolute"
//               top={2}
//               right={2}
//               _hover={{
//                 transform: "translateY(-2px)",
//                 boxShadow: "lg",
//               }}
//             >
//               Edit Background
//             </Button>
//           </Box>

//           <Flex justify={"center"} mt={-12}>
//             <Avatar
//               size={"xl"}
//               src={userProfile.profileImage}
//               css={{ border: "2px solid white" }}
//             />
//           </Flex>
//           <Box p={6}>
//             <Stack spacing={0} align={"center"} mb={3}>
//               <Heading fontSize={"2xl"} fontWeight={500}>
//                 @{userProfile.name}
//               </Heading>
//             </Stack>
//             <Stack spacing={0} align={"center"} mb={4}>
//               <Text color={"gray.500"}>
//                 {userProfile.goal} | {userProfile.gymName}
//               </Text>
//             </Stack>
//             <Stack spacing={0} align={"center"} mt={4}>
//               <Text color={"gray.500"}>{userProfile.bio}</Text>
//             </Stack>
//             <Stack direction={"row"} justify={"center"} spacing={6} mt={8}>
//               <Stack
//                 spacing={0}
//                 align={"center"}
//                 onClick={async () => {
//                   const followers = await getFollowers(uid);
//                   setFollowersList(followers);
//                   setIsFollowersOpen(true);
//                 }}
//                 style={{ cursor: "pointer" }}
//               >
//                 <Text fontWeight={600}>{userProfile.followers}</Text>
//                 <Text fontSize={"sm"} color={"gray.500"}>
//                   Followers
//                 </Text>
//               </Stack>
//               <Stack
//                 spacing={0}
//                 align={"center"}
//                 onClick={async () => {
//                   console.log("frontend get following");
//                   const following = await getFollowing(uid);
//                   setFollowingList(following);
//                   setIsFollowingOpen(true);
//                 }}
//                 style={{ cursor: "pointer" }}
//               >
//                 <Text fontWeight={600}>{userProfile.following}</Text>
//                 <Text fontSize={"sm"} color={"gray.500"}>
//                   Following
//                 </Text>
//               </Stack>
//               <Stack spacing={0} align={"center"}>
//                 <Text fontWeight={600}>{userProfile.postsCount || 0}</Text>
//                 <Text fontSize={"sm"} color={"gray.500"}>
//                   Posts
//                 </Text>
//               </Stack>
//             </Stack>
//             <Stack direction={"row"} spacing={4} mt={6}>
//               <Button
//                 onClick={onProfileOpen}
//                 colorScheme="blue"
//                 w={"full"}
//                 bg={colorEditButton}
//                 color={"white"}
//                 rounded={"md"}
//                 _hover={{
//                   transform: "translateY(-2px)",
//                   boxShadow: "lg",
//                 }}
//               >
//                 Edit Profile
//               </Button>
//             </Stack>
//           </Box>
//         </Box>
//       </Center>

//       {/* Followers Modal */}
//       <Modal isOpen={isFollowersOpen} onClose={() => setIsFollowersOpen(false)}>
//         <ModalOverlay />
//         <ModalContent>
//           <ModalHeader>Followers</ModalHeader>
//           <ModalCloseButton />
//           <ModalBody>
//             {followersList.length === 0 ? (
//               <Text>No followers yet</Text>
//             ) : (
//               <VStack align="start" spacing={4} pb={4}>
//                 {followersList.map((user) => (
//                   <Flex
//                     key={user.uid} // Use uid or _id
//                     align="center"
//                     justify="space-between"
//                     w="full"
//                   >
//                     <Flex align="center">
//                       <Link to={`/user/${user.uid}`}>
//                         <Avatar src={user.picture} size="sm" mr={2} />
//                       </Link>
//                       <Link to={`/user/${user._id}`}>
//                         <Text _hover={{ textDecoration: "underline" }}>
//                           {user.name}
//                         </Text>
//                       </Link>
//                     </Flex>
//                     {user.uid !== uid && (
//                       <Button
//                         size="sm"
//                         colorScheme={followingStatus[user.uid] ? "red" : "blue"}
//                         variant={
//                           followingStatus[user.uid] ? "outline" : "solid"
//                         }
//                         onClick={() => handleFollow(user.uid)}
//                         isLoading={loadingStates[user.uid]}
//                         loadingText={
//                           followingStatus[user.uid]
//                             ? "Unfollowing..."
//                             : "Following..."
//                         }
//                       >
//                         {followingStatus[user.uid] ? "Unfollow" : "Follow"}
//                       </Button>
//                     )}
//                   </Flex>
//                 ))}
//               </VStack>
//             )}
//           </ModalBody>
//         </ModalContent>
//       </Modal>

//       {/* Following Modal */}
//       <Modal isOpen={isFollowingOpen} onClose={() => setIsFollowingOpen(false)}>
//         <ModalOverlay />
//         <ModalContent>
//           <ModalHeader>Following</ModalHeader>
//           <ModalCloseButton />
//           <ModalBody>
//             {followingList.length === 0 ? (
//               <Text>Not following anyone yet</Text>
//             ) : (
//               <VStack align="start" spacing={4} pb={4}>
//                 {followingList.map((user) => (
//                   <Flex
//                     key={user.uid}
//                     align="center"
//                     justify="space-between"
//                     w="full"
//                   >
//                     <Flex align="center">
//                       <Link to={`/user/${user.uid}`}>
//                         <Avatar src={user.picture} size="sm" mr={2} />
//                       </Link>
//                       <Link to={`/user/${user.uid}`}>
//                         <Text _hover={{ textDecoration: "underline" }}>
//                           {user.name}
//                         </Text>
//                       </Link>
//                     </Flex>
//                     {user.uid !== uid && (
//                       <Button
//                         size="sm"
//                         colorScheme="red"
//                         variant="outline"
//                         onClick={() => handleFollow(user.uid)}
//                         isLoading={loadingStates[user.uid]}
//                         loadingText="Unfollowing..."
//                       >
//                         Unfollow
//                       </Button>
//                     )}
//                   </Flex>
//                 ))}
//               </VStack>
//             )}
//           </ModalBody>
//         </ModalContent>
//       </Modal>

//       {/* Profile Edit Modal */}
//       <Modal isOpen={isProfileOpen} onClose={onProfileClose}>
//         <form onSubmit={handleProfileSubmit}>
//           <ModalOverlay />
//           <ModalContent>
//             <ModalHeader>Update Profile</ModalHeader>
//             <ModalCloseButton />
//             <ModalBody>
//               <VStack spacing={4}>
//                 <Image
//                   src={userProfile.profileImage}
//                   alt="Profile Picture"
//                   boxSize="150px"
//                   objectFit="cover"
//                   borderRadius="full"
//                 />
//                 <FileUploader
//                   handleFile={handleProfileImageUpload}
//                   accept="image/jpeg,image/png,image/gif"
//                 />
//                 <Input
//                   type="text"
//                   name="name"
//                   value={userProfile.name}
//                   onChange={(e) =>
//                     setUserProfile((prev) => ({
//                       ...prev,
//                       name: e.target.value,
//                     }))
//                   }
//                   placeholder="Name"
//                 />
//                 <Input
//                   type="text"
//                   name="goal"
//                   value={userProfile.goal}
//                   onChange={(e) =>
//                     setUserProfile((prev) => ({
//                       ...prev,
//                       goal: e.target.value,
//                     }))
//                   }
//                   placeholder="Fitness Goal"
//                 />
//                 <Textarea
//                   name="bio"
//                   value={userProfile.bio}
//                   onChange={(e) =>
//                     setUserProfile((prev) => ({ ...prev, bio: e.target.value }))
//                   }
//                   placeholder="Bio"
//                 />
//                 <select
//                   value={userProfile.gymName || "Select a location"}
//                   onChange={(e) =>
//                     setUserProfile((prev) => ({
//                       ...prev,
//                       gymName: e.target.value,
//                     }))
//                   }
//                   className="w-full p-2 border rounded bg-inherit"
//                 >
//                   {/* <option value="">Select a location</option> */}
//                   <option value="Blink Fitness">Blink Fitness</option>
//                   <option value="Planet Fitness">Planet Fitness</option>
//                   <option value="Retro Fitness">Retro Fitness</option>
//                   <option value="Home">Home</option>
//                 </select>
//               </VStack>
//             </ModalBody>
//             <ModalFooter>
//               <Button type="submit" colorScheme="blue" mr={3}>
//                 Update
//               </Button>
//               <Button variant="ghost" onClick={onProfileClose}>
//                 Cancel
//               </Button>
//             </ModalFooter>
//           </ModalContent>
//         </form>
//       </Modal>

//       {/* Background Edit Modal */}
//       <Modal isOpen={isBackgroundOpen} onClose={onBackgroundClose}>
//         <form onSubmit={handleBackgroundSubmit}>
//           <ModalOverlay />
//           <ModalContent>
//             <ModalHeader>Update Background Picture</ModalHeader>
//             <ModalCloseButton />
//             <ModalBody>
//               <VStack spacing={4}>
//                 <Image
//                   src={userProfile.backgroundPicture}
//                   alt="Background Picture"
//                   boxSize="150px"
//                   objectFit="cover"
//                   borderRadius="full"
//                 />
//                 <FileUploader
//                   handleFile={handleBackgroundImageUpload}
//                   accept="image/jpeg,image/png,image/gif"
//                 />
//               </VStack>
//             </ModalBody>
//             <ModalFooter>
//               <Button type="submit" colorScheme="blue" mr={3}>
//                 Update
//               </Button>
//               <Button variant="ghost" onClick={onBackgroundClose}>
//                 Cancel
//               </Button>
//             </ModalFooter>
//           </ModalContent>
//         </form>
//       </Modal>

//       <VStack spacing={8} mt={10}>
//         <Text
//           fontSize={"22"}
//           fontWeight={"bold"}
//           bgGradient={"linear(to-r, blue.200, gray.400)"}
//           bgClip={"text"}
//         >
//           Workout Page
//         </Text>
//         {isLoading ? (
//           <Box
//             display="flex"
//             justifyContent="center"
//             alignItems="center"
//             height="200px"
//           >
//             <Spinner
//               size="lg"
//               thickness="4px"
//               speed="1.2s"
//               color={useColorModeValue("gray.700", "gray.400")}
//             />
//           </Box>
//         ) : entries.length > 0 ? (
//           <>
//             <SimpleGrid
//               columns={{ base: 1, md: 2, lg: 3 }}
//               spacing={10}
//               w={"full"}
//             >
//               {entries.map((entry) => (
//                 <ProductCard key={entry._id} entry={entry} />
//               ))}
//             </SimpleGrid>
//             <Box
//               mt={6}
//               display="flex"
//               justifyContent="center"
//               alignItems="center"
//             >
//               <Button
//                 onClick={() => handlePageChange(currentPage - 1)}
//                 isDisabled={currentPage === 1}
//                 mr={2}
//               >
//                 <SlArrowLeft />
//               </Button>
//               <Text mx={2}>
//                 {currentPage} • {totalPages}
//               </Text>
//               <Button
//                 onClick={() => handlePageChange(currentPage + 1)}
//                 isDisabled={currentPage === totalPages || totalPages === 0}
//                 ml={2}
//               >
//                 <SlArrowRight />
//               </Button>
//             </Box>
//           </>
//         ) : (
//           <Text>No posts available.</Text>
//         )}
//       </VStack>
//     </Container>
//   );
// };

// export default ProfilePage;
