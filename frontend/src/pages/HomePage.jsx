import { Container, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useProductStore } from "../store/product";
import ProductCard from "../components/ProductCard";

import { auth, googleProvider } from "../firebase";
import { signInWithPopup } from "firebase/auth";

const HomePage = () => {
  // const { fetchEntrys, entrys } = useProductStore();
  const [uid, setUid] = useState(null);
  const [posts, setPosts] = useState([]);
  const [entries, setEntries] = useState([]);

  // useEffect(() => {
  //   fetchEntrys();
  // }, [fetchEntrys]);

  // console.log("entrys", entrys);

  // useEffect(() => {
  //   const fetchProtectedData = async () => {
  //     try {
  //       const token = await auth.currentUser.getIdToken();
  //       const response = await fetch("http://localhost:5001/api/protected", {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //           Authorization: `Bearer ${token}`,
  //         },
  //       });
  //       if (!response.ok) {
  //         throw new Error(await response.text());
  //       }

  //       const userData = await response.json();
  //       console.log("User Data:", userData);
  //     } catch (error) {
  //       console.error("Error fetching protected data:", error);
  //     }
  //   };

  //   fetchProtectedData();
  // });

  // const [uid, setUid] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        if (!user) {
          console.log("User authenticated:", user.uid);
          return;
        }
        setUid(user.uid);
        // try {
        //   const token = await user.getIdToken();
        //   console.log("uid", user.uid);
        //   const response = await fetch(
        //     `http://localhost:5001/api/posts/${user.uid}`,
        //     {
        //       method: "GET",
        //       headers: {
        //         "Content-Type": "application/json",
        //         Authorization: `Bearer ${token}`,
        //       },
        //     }
        //   );

        //   const data = await response.json();
        //   console.log("Data:", data);
        //   if (data.success) {
        //     setEntries(data.data);
        //   } else {
        //     console.error("Failed to fetch posts:", data.message);
        //   }
        // } catch (error) {
        //   console.error("Error fetching posts:", error);
        // }
      } else {
        console.error("User not authenticated");
      }
    });

    return () => unsubscribe();
  }, [uid]);

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

  const getUser = async () => {
    try {
      const user = auth.currentUser;
      const uid = user.uid;
      const token = await user.getIdToken();
      const response = await fetch(`http://localhost:5001/api/getUser/${uid}`, {
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
      if (result.success) {
        setEntries(result.data);
      }
      console.log("User:", result);
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

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

  return (
    <Container maxW="container.xl" py={12}>
      <div className="w-screen h-screen flex justify-center items-center">
        <button
          onClick={handleGoogleSignIn}
          className="p-3 bg-gray-400 rounded-md"
        >
          Sign In with Google
        </button>
        {"     ...    "}
        {"     ...    "}
        <button
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
        </button>
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
