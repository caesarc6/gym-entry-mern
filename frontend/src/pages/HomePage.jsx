import {
  Container,
  SimpleGrid,
  Text,
  VStack,
  Button,
  Box,
  Spinner,
  useColorModeValue,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useProductStore } from "../store/product";
import ProductCard from "../components/ProductCard";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup } from "firebase/auth";
import { Hero } from "../components/Hero";
import { SlArrowRight } from "react-icons/sl";
import { SlArrowLeft } from "react-icons/sl";

const HomePage = () => {
  const { fetchEntrys, entrys, clearEntrys, updateEntry } = useProductStore();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uid, setUid] = useState(null);
  const [posts, setPosts] = useState([]);
  const [entries, setEntries] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(6);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalPosts: 0,
    limit: 6,
  });

  // Define spinner color at the top level
  const spinnerColor = useColorModeValue("gray.700", "gray.400");

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && totalPages > 0) {
      setCurrentPage(newPage);
    }
  };

  // Handle auth state
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
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [clearEntrys]);

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setIsLoading(true);
        if (!uid) return;

        const user = auth.currentUser;
        if (!user) return;

        const token = await user.getIdToken();
        const response = await fetch(
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
          setPagination({
            ...data.pagination,
            totalPages: data.data.length === 0 ? 0 : data.pagination.totalPages,
          });
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

  const totalPages = pagination.totalPages;

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
    }
  };

  const searchPostsByUID = async () => {
    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();
      const uid = user.uid;
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

  const getAllUID = async () => {
    try {
      const token = await auth.currentUser.getIdToken();
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
        console.error("Error fetching current user:", error);
      }
    } catch (error) {
      console.error("Error during sign-in:", error);
      handleSignOutUser();
    }
  };

  const handleSignOutUser = async () => {
    try {
      await auth.signOut();
      console.log("Signed out");
      setUid(null);
      setIsSignedIn(false);
      setEntries([]);
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
              bgClip={"text"}
              textAlign={"center"}
            >
              Workout Page
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
                  color={spinnerColor} // Use the precomputed color
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
                    isDisabled={currentPage === 1 || totalPages === 0}
                    mr={2}
                  >
                    <SlArrowLeft />
                  </Button>
                  <Text mx={2}>
                    {totalPages === 0
                      ? "0 • 0"
                      : `${currentPage} • ${totalPages}`}
                  </Text>
                  <Button
                    onClick={() => handlePageChange(currentPage + 1)}
                    isDisabled={currentPage === totalPages || totalPages === 0}
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
