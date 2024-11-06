import { Container, SimpleGrid, Text, VStack, Button } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useProductStore } from "../store/product";
import ProductCard from "../components/ProductCard";

import { auth, googleProvider } from "../firebase";
import { signInWithPopup } from "firebase/auth";

import { Stack, Badge, Box, HStack, Icon, Image } from "@chakra-ui/react";
import { HiStar } from "react-icons/hi";

const HomePage = () => {
  const { fetchEntrys, entrys, clearEntrys } = useProductStore();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [uid, setUid] = useState(null);
  const [entries, setEntries] = useState([]);

  // Function to fetch entries (dummy function for illustration)
  const fetchEntries = async () => {
    try {
      const response = await fetch("/api/entrys"); // Adjust the endpoint as needed
      if (!response.ok) {
        throw new Error("Failed to fetch entries");
      }
      const data = await response.json();
      setEntries(data);
    } catch (error) {
      console.error("Error fetching entries:", error);
    }
  };

  // Update entries when user signs out
  useEffect(() => {
    if (!isSignedIn) {
      // fetchEntries();
      // clear feed
      setEntries([]);
    }
  }, [isSignedIn]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log("User authenticated:", user.uid);
        setUid(user.uid);
        // fetchEntrys();
      } else {
        console.error("User not authenticated");
        setUid(null);
        clearEntrys();
      }
    });

    return () => unsubscribe();
  }, [fetchEntrys, clearEntrys]);

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
        // const uids = "1";
        // const token = await user.getIdToken();
        // const uid = user.uid;
        console.log("uid from fetch posts", uid);
        const response = await fetch(`http://localhost:5001/api/posts/${uid}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        console.log("Data11:", data);
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

  // save token in local storage b/c sending token requests takes alot of time and is slow
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // console.log(result);
      const token = await result.user.getIdToken();

      const response = await fetch("http://localhost:5001/api/protected", {
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
      // console.log("User Data:", userData);
      try {
        const token = await auth.currentUser.getIdToken();
        const response = await fetch(
          "http://localhost:5001/api/getCurrentUser",
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
        const resultOne = await response.json();
        console.log("Logged in as:", resultOne);
      } catch (error) {
        console.error("Error fetching all UID:", error);
      }
    } catch (error) {
      console.error("Error during sign-in:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      console.log("User signed out");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // handle signout
  const handleSignOutUser = async () => {
    try {
      await auth.signOut();
      console.log("Signed out");
      setUid(null);
      setIsSignedIn(false);
      setEntries([]);
      // set uid to null

      // set isSignedIn to false
      // handleSignOut();
      // fetch entries and update state
      // change button to sign in
      // setIsSignedIn(false);
      // fetchEntries();
    } catch (error) {
      console.error("Error during sign-out:", error);
    }
  };

  const data = {
    imageUrl: "https://bit.ly/2Z4KKcF",
    imageAlt: "Rear view of modern home with pool",
    beds: 3,
    title: "Modern home in city center in the heart of historic Los Angeles",
    formattedPrice: "$435",
    reviewCount: 34,
    rating: 4.5,
  };

  return (
    <Container maxW="container.xl" className="text-center" py={12}>
      {/* <div
        className="w-screen h-screen flex justify-center items-center"
        style={{ justifyItems: "center" }}
      > */}
      <SimpleGrid
        columns={{
          base: 1,
          md: 1,
          lg: 1,
        }}
        spacing={10}
        w={"full"}
        style={{ placeItems: "center" }}
      >
        <Stack
          direction="row"
          maxW="md"
          borderWidth="1px"
          className="content-center flex-wrap flex-row"
          style={{ justifyContent: "center", borderRadius: "70px" }}
        >
          {/* <Image maxW="sm" src={data.imageUrl} alt={data.imageAlt} /> */}
          <Image
            src="https://bit.ly/naruto-sage"
            boxSize="150px"
            borderRadius="full"
            fit="cover"
            alt="Naruto Uzumaki"
            style={{ placeSelf: "center", padding: "10px 10px" }}
          />

          <Box
            p="4"
            spaceY="0"
            style={{ display: "block", alignContent: "center" }}
          >
            <HStack direction="row">
              <VStack>
                <HStack>
                  <VStack>
                    <Text fontSize="xl" fontWeight="bold">
                      Strength
                    </Text>
                    <Badge colorPalette="teal" variant="solid">
                      Goal
                    </Badge>
                  </VStack>
                  <VStack>
                    <Text fontSize="xl" fontWeight="bold">
                      6
                    </Text>
                    <Badge colorPalette="teal" variant="solid">
                      Posts
                    </Badge>
                  </VStack>
                  <VStack>
                    <Text fontSize="xl" fontWeight="bold">
                      Blink
                    </Text>
                    <Badge colorPalette="teal" variant="solid">
                      Gym
                    </Badge>
                  </VStack>
                </HStack>
                <HStack gap="1" fontWeight="medium">
                  <Text>
                    My goal is to become stronger. I want to be able to run 5km
                    under a certain time!
                  </Text>
                </HStack>
              </VStack>
            </HStack>
            {/* <Text fontWeight="medium" color="fg">
              {data.title}
            </Text>
            <HStack color="fg.muted">
              {data.formattedPrice} • {data.beds} beds
            </HStack> */}
          </Box>
        </Stack>
      </SimpleGrid>
      {/* </div> */}
      <div
        className="w-screen h-screen flex justify-center items-center"
        style={{ textAlign: "center" }}
      >
        {/*   if user is signed in show handleSignOut   */}
        {/* {isSignedIn ? (
          <Button
            onClick={() => {
              handleSignOutUser();
              handleSignOut();
              setUid(null); // Update uid when user signs out
              fetchEntries();
            }}
            className="p-3 bg-red-400 rounded-md"
          >
            Sign Out
          </Button>
        ) : (
          <Button
            onClick={async () => {
              await handleGoogleSignIn();
              setIsSignedIn(true); // Update isSignedIn when user signs in
            }}
            className="p-3 bg-gray-400 rounded-md"
          >
            Sign In with Google
          </Button>
        )} */}
      </div>
      <VStack spacing={8}>
        <Text
          fontSize={"22"}
          fontWeight={"bold"}
          bgGradient={"linear(to-r, blue.200, gray.400)"}
          // bgGradient="linear(to-r, red.600, red.400, yellow.300)"
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

export default HomePage;
