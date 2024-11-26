import { Container, SimpleGrid, Text, VStack, Button } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useProductStore } from "../store/product";
import ProductCard from "../components/ProductCard";

import { auth, googleProvider } from "../firebase";
import { getAuth, signInWithPopup } from "firebase/auth";

import { Stack, Badge, Box, HStack, Icon, Image } from "@chakra-ui/react";
import { HiStar } from "react-icons/hi";

const ProfilePage = () => {
  const { fetchEntrys, entrys, clearEntrys } = useProductStore();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [uid, setUid] = useState(null);
  const [entries, setEntries] = useState([]);
  const [userProfile, setUserProfile] = useState({
    name: "",
    goal: "",
    gymName: "",
    postsCount: 0,
    profileImage: "",
    bio: "",
  });

  useEffect(() => {
    if (!isSignedIn) {
      // fetchEntries();
      // clear feed
      setEntries([]);
    }
  }, [isSignedIn]);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        console.log("User authenticated:", user.uid);
        setIsSignedIn(true);
        setUid(user.uid);
        // fetchUserProfile(user);
        fetchUserProfile(user);
        console.log("User:", user.accessToken, user.uid);
      } else {
        console.error("User not authenticated");
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

  // Update user profile when entries change
  // useEffect(() => {
  //   if (uid && auth.currentUser) {
  //     fetchUserProfile(); // Remove parameters
  //   }
  // }, [entries, uid]);

  // Function to fetch user profile
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
    //       // console.log("ID Token:", idToken);
    //       console.log("token:", token);
    //     })
    //     .catch((error) => {
    //       // Handle error
    //       console.error("Error getting ID token:", error);
    //     });
    // } else {
    //   // No user is signed in.
    // }
    try {
      if (!token) {
        console.error("No authenticated token found");
        return;
      }

      // const token = await user.getIdToken();
      const response = await fetch(
        `http://localhost:5001/api/getUserProfile/${uid}`,
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
      console.log("User profile data:", data);

      if (data.success) {
        setUserProfile({
          name: data.data.name || "Anonymous",
          goal: data.goal || "Not set",
          gymName: data.data.gymName || "Not specified",
          postsCount: data.postsCount,
          bio: data.data.bio || "No bio available",
          profileImage:
            data.data.profileImage ||
            "https://johnjayathletics.com/images/logos/site/site.png",
        });
      } else {
        console.error("Failed to fetch user profile:", data.message);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  // Fetch user profile when UID changes
  // useEffect(() => {
  //   fetchUserProfile();
  // }, [uid]);

  // Update user profile when entries change
  // useEffect(() => {
  //   if (uid && auth.currentUser) {
  //     auth.currentUser.getIdToken().then((token) => {
  //       fetchUserProfile(token, uid);
  //     });
  //   }
  // }, [entries, uid]);

  // Fetch posts effect
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
        const response = await fetch(`http://localhost:5001/api/posts/${uid}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        console.log("Posts data:", data);
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
            src={userProfile.profileImage || "https://bit.ly/naruto-sage"}
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
              </VStack>
            </HStack>
          </Box>
        </Stack>
      </SimpleGrid>

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

export default ProfilePage;
