import { Container, SimpleGrid, Text, VStack, Button } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useProductStore } from "../store/product";
import ProductCard from "../components/ProductCard";
import ProfilePage from "./ProfilePage";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup } from "firebase/auth";

const HomePage = () => {
  const { fetchEntrys, entrys, clearEntrys } = useProductStore();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  const [uid, setUid] = useState(null);
  const [posts, setPosts] = useState([]);
  const [entries, setEntries] = useState([]);

  // Update entries when user signs out
  // useEffect(() => {
  //   if (!isSignedIn) {
  //     // fetchEntries();
  //     // clear feed
  //     setEntries([]);
  //   }
  // }, [isSignedIn]);

  // Add this useEffect to handle initial auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsSignedIn(true);
        setUid(user.uid);
      } else {
        setIsSignedIn(false);
        setUid(null);
        setEntries([]);
        clearEntrys();
      }
      setIsLoading(false); // Set loading to false once we know the auth state
    });

    return () => unsubscribe(); // Cleanup subscription
  }, [clearEntrys]);

  // Your existing useEffect for fetching posts
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        if (!uid) return;

        const user = auth.currentUser;
        if (!user) return;

        const token = await user.getIdToken();
        const response = await fetch(`http://localhost:5001/api/posts/${uid}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        if (data.success) {
          setEntries(data.data);
        }
      } catch (error) {
        console.error("Error fetching posts:", error);
      }
    };

    if (uid) {
      fetchPosts();
    }
  }, [uid]);

  // Function to fetch entries (dummy function for illustration)
  // const fetchEntries = async () => {
  //   try {
  //     const response = await fetch("/api/entrys"); // Adjust the endpoint as needed
  //     if (!response.ok) {
  //       throw new Error("Failed to fetch entries");
  //     }
  //     const data = await response.json();
  //     setEntries(data);
  //   } catch (error) {
  //     console.error("Error fetching entries:", error);
  //   }
  // };

  // save token in local storage b/c sending token requests takes alot of time and is slow

  const searchPostsByUID = async () => {
    try {
      // getCurrentUser
      const user = auth.currentUser;
      const token = await user.getIdToken();
      const uid = user.uid;
      // const token = await auth.currentUser.getIdToken();
      const response = await fetch(`http://localhost:5001/api/posts/${uid}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = await response.json();
      console.log("Search result:", result);
      setPosts(result);
    } catch (error) {
      console.error("Error searching posts by UID:", error);
    }
  };

  const getAllUID = async () => {
    try {
      const token = await auth.currentUser.getIdToken(); //
      const response = await fetch("http://localhost:5001/api/getUsers", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const result = await response.json();
      // map through the result and get the UID
      const users = result.data.map((user) => ({
        name: user.name,
        uid: user.uid,
      }));
      console.log("All UIDs:", users);
    } catch (error) {
      console.error("Error fetching all UID:", error);
    }
  };

  const getCurrentUser = async () => {
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("http://localhost:5001/api/getCurrentUser", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const result = await response.json();
      console.log("Current User:", result);
      return result;
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  // const getUser = async () => {
  //   try {
  //     const user = auth.currentUser;
  //     const uid = user.uid;
  //     const token = await user.getIdToken();
  //     const response = await fetch(`http://localhost:5001/api/getUser/${uid}`, {
  //       method: "GET",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${token}`,
  //       },
  //     });
  //     if (!response.ok) {
  //       throw new Error(await response.text());
  //     }
  //     const result = await response.json();
  //     if (result.success) {
  //       setEntries(result.data);
  //     }
  //     console.log("User:", result);
  //   } catch (error) {
  //     console.error("Error fetching user:", error);
  //   }
  // };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log(result);
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
      // clear feed and user sign in state to sign out
      console.error("Error during sign-in:", error);
      handleSignOutUser();
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

  return (
    <Container maxW="container.xl" className="text-center" py={12}>
      {/* {"     ...    "} */}
      {/* {"     ...    "} */}
      {/* <button
          onClick={searchPostsByUID}
          className="p-3 bg-blue-400 rounded-md ml-4"
          // disabled={!uid}
        >
          Search Posts by UID
        </button>

        {"     ...    "}
        {"     ...    "}
        <button
          onClick={getAllUID}
          className="p-3 bg-blue-400 rounded-md ml-4"
          // disabled={!uid}
        >
          get all UID's
        </button>
        {"     ...    "}
        {"     ...    "}
        <button
          onClick={getCurrentUser}
          className="p-3 bg-blue-400 rounded-md ml-4"
          // disabled={!uid}
        >
          getCurrentUser
        </button> */}

      <div
        className=" flex justify-center items-center"
        style={{ textAlign: "center" }}
      >
        {isLoading ? (
          <Button isLoading>Loading...</Button>
        ) : isSignedIn ? (
          <Button
            onClick={() => {
              handleSignOutUser();
              // handleSignOut();
              setUid(null);
              // fetchEntries();
            }}
            className="p-3 bg-red-400 rounded-md"
          >
            Sign Out
          </Button>
        ) : (
          <Button
            onClick={async () => {
              await handleGoogleSignIn();
              setIsSignedIn(true);
            }}
            className="p-3 bg-gray-400 rounded-md"
          >
            Sign In with Google
          </Button>
        )}
      </div>

      <div
        className="flex justify-center items-center"
        style={{ textAlign: "center" }}
      >
        <Button className="p-3  rounded-md">
          <Link to={"/profile"}>Profile</Link>
        </Button>
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
            <div
              className=" flex justify-center items-center"
              style={{ textAlign: "center" }}
            >
              {isLoading ? (
                <Button isLoading>Loading...</Button>
              ) : isSignedIn ? (
                <div>
                  <div>signed in</div>
                </div>
              ) : (
                <div>
                  Sign up or login here
                  <div>
                    <div>
                      <Link> yerrrrr </Link>
                    </div>
                    <div>
                      <button>hi</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Text>
        )}
      </VStack>
    </Container>
  );
};

export default HomePage;
