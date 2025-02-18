import {
  Container,
  SimpleGrid,
  Text,
  VStack,
  Button,
  Box,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useProductStore } from "../store/product";
import ProductCard from "../components/ProductCard";
import ProfilePage from "./ProfilePage";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup } from "firebase/auth";
import { Hero } from "../components/Hero";

const HomePage = () => {
  const { fetchEntrys, entrys, clearEntrys, updateEntry } = useProductStore();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  const [uid, setUid] = useState(null);
  const [posts, setPosts] = useState([]);
  const [entries, setEntries] = useState([]);

  //
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(6); // Number of items per page

  // Slice the entries array to get only the items for the current page
  const startIndex = (currentPage - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedEntries = [...entries].reverse().slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };
  //
  const leftString = "<";
  const rightString = ">";
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

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalPosts: 0,
    limit: 6,
  });

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setIsLoading(true); // Set loading to true before fetching
        if (!uid) return;

        const user = auth.currentUser;
        if (!user) return;

        const token = await user.getIdToken();
        const response = await fetch(
          // `http://localhost:5001/api/posts/${uid}?page=${currentPage}&limit=${limit}`,
          `https://gym-tracker-brown.vercel.app/api/posts/${uid}?page=${currentPage}&limit=${limit}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();
        if (data.success) {
          setEntries(data.data);
          setPagination(data.pagination); // Store pagination data
        }
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (uid) {
      fetchPosts();
    }
  }, [uid, currentPage, limit]);

  // Calculate the total number of pages
  const totalPages = pagination.totalPages;

  // Your existing useEffect for fetching posts
  // useEffect(() => {
  //   const fetchPosts = async () => {
  //     try {
  //       if (!uid) return;

  //       const user = auth.currentUser;
  //       if (!user) return;

  //       const token = await user.getIdToken();
  //       const response = await fetch(
  //         `http://localhost:5001/api/posts/${uid}?page=${currentPage}&limit=${limit}`,
  //         // `http://localhost:5001/api/posts/${uid}?limit=7`,
  //         // `http://localhost:5173/api/posts/${uid}?limit=10`,
  //         // `https://gym-tracker-brown.vercel.app/api/posts/${uid}`,
  //         {
  //           method: "GET",
  //           headers: {
  //             "Content-Type": "application/json",
  //             Authorization: `Bearer ${token}`,
  //           },
  //         }
  //       );

  //       const data = await response.json();
  //       if (data.success) {
  //         setEntries(data.data);
  //       }
  //     } catch (error) {
  //       console.error("Error fetching posts:", error);
  //     }
  //   };

  //   if (uid) {
  //     fetchPosts();
  //   }
  // }, [uid, currentPage, limit, totalPages]);

  // save token in local storage b/c sending token requests takes alot of time and is slow

  const handleUpdateEntry = async (pid, updatedEntry) => {
    // Save the current state for potential rollback
    const previousEntries = [...entries];

    // Optimistically update the local state
    const updatedEntries = entries.map((entry) =>
      entry._id === pid ? { ...entry, ...updatedEntry } : entry
    );
    setEntries(updatedEntries);

    try {
      // Send the update request to the server
      const { success, message, data } = await updateEntry(pid, updatedEntry);

      if (!success) {
        // Revert to the previous state if the request fails
        setEntries(previousEntries);
        console.error("Failed to update entry:", message);
        // Optionally show an error toast
      } else {
        // Update the local state with the server response
        setEntries((prevEntries) =>
          prevEntries.map((entry) =>
            entry._id === pid ? { ...entry, ...data.data } : entry
          )
        );
        // Optionally show a success toast
      }
    } catch (error) {
      // Revert to the previous state if there's an error
      setEntries(previousEntries);
      console.error("Error updating entry:", error);
      // Optionally show an error toast
    }
  };

  const searchPostsByUID = async () => {
    try {
      // getCurrentUser
      const user = auth.currentUser;
      const token = await user.getIdToken();
      const uid = user.uid;
      // const token = await auth.currentUser.getIdToken();
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

  if (isLoading) {
    return (
      <Box textAlign="center" mt={10}>
        <Text>Loading...</Text>
      </Box>
    );
  }

  const getAllUID = async () => {
    try {
      const token = await auth.currentUser.getIdToken(); //
      const response = await fetch(
        "https://gym-tracker-brown.vercel.app/api/getUsers",
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
      const response = await fetch(
        "https://gym-tracker-brown.vercel.app/api/getCurrentUser",
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
      const result = await response.json();
      console.log("Current User:", result);
      return result;
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log(result);
      const token = await result.user.getIdToken();

      const response = await fetch(
        "https://gym-tracker-brown.vercel.app/api/protected",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const userData = await response.json();
      console.log("User Data:", userData.uid);
      // console.log("User Data:", userData);
      try {
        const token = await auth.currentUser.getIdToken();
        const response = await fetch(
          "https://gym-tracker-brown.vercel.app/api/getCurrentUser",
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
    <Container maxW="container.xl" className="text-center z-0 relative">
      {isSignedIn ? (
        <>
          <VStack spacing={8} className="pt-[112px]">
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
            <div>
              <div
                className="gap-9  flex-col justify-center"
                style={{ textAlign: "center" }}
              >
                <Button className="p-3 m-2 rounded-md">
                  <Link className="py-[10px] px-[8px]" to={"/profile"}>
                    Profile
                  </Link>
                </Button>

                <Button
                  onClick={() => {
                    handleSignOutUser();
                    // handleSignOut();
                    setUid(null);
                    // fetchEntries();
                  }}
                  className="p-3 m-2 bg-red-400 rounded-md"
                >
                  Sign Out
                </Button>
              </div>
            </div>

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
                  onUpdate={handleUpdateEntry}
                />
              ))}

              {/* {[...entries].reverse().map((entry) => (
                <ProductCard
                  key={entry._id}
                  entry={entry}
                  onUpdate={handleUpdateEntry}
                />
              ))} */}
            </SimpleGrid>
            {/* Pagination controls */}
            <Box
              mt={6}
              display="flex"
              justifyContent="center"
              alignItems="center"
            >
              <Button
                onClick={() => handlePageChange(currentPage - 1)}
                isDisabled={currentPage === 1}
                mr={2}
              >
                {leftString}
              </Button>
              <Text mx={2}>
                Page {currentPage} of {totalPages}
              </Text>
              <Button
                onClick={() => handlePageChange(currentPage + 1)}
                isDisabled={currentPage === totalPages}
                ml={2}
              >
                {rightString}
              </Button>
            </Box>
            <div>
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
                  ></div>
                </Text>
              )}
            </div>
          </VStack>
        </>
      ) : (
        <Hero />
      )}
    </Container>
  );
};

export default HomePage;
