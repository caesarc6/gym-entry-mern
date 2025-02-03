import { Container, SimpleGrid, Text, VStack, Button } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useProductStore } from "../store/product";
import ProductCard from "../components/ProductCard";
import ProfilePage from "./ProfilePage";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup } from "firebase/auth";

const HomePage = () => {
  const { fetchEntrys, entrys, clearEntrys, updateEntry } = useProductStore();
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

      {isSignedIn ? (
        <>
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
            <div>
              <div
                className="gap-9 flex flex-col justify-center"
                style={{ textAlign: "center" }}
              >
                <Button className="p-3  rounded-md">
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
                  className="p-3 bg-red-400 rounded-md"
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
              {[...entries].reverse().map((entry) => (
                <ProductCard
                  key={entry._id}
                  entry={entry}
                  onUpdate={handleUpdateEntry}
                />
              ))}
            </SimpleGrid>

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
          {/* </div> */}
        </>
      ) : (
        <>
          {/* Hero */}
          <div className="relative overflow-hidden py-24 lg:py-32">
            {/* Gradients */}
            <div
              aria-hidden="true"
              className="flex absolute -top-96 start-1/2 transform -translate-x-1/2 bg-[#061f32]"
            >
              <div className="bg-gradient-to-r from-background/50 to-background blur-3xl w-[25rem] h-[44rem] rotate-[-60deg] transform -translate-x-[10rem] bg-slate-700" />
              <div className="bg-gradient-to-tl blur-3xl w-[90rem] h-[50rem] rounded-full origin-top-left -rotate-12 -translate-x-[15rem] from-primary-foreground via-primary-foreground to-background bg-[#cfe6ff]" />
            </div>
            {/* End Gradients */}
            <div className="relative z-10">
              <div className="container py-10 lg:py-16">
                <div className="max-w-2xl text-center mx-auto">
                  <p className="">All your workouts. In one place.</p>
                  {/* Title */}
                  <div className="mt-5 max-w-2xl">
                    <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                      Track Your Progress Simply.
                    </h1>
                  </div>
                  {/* End Title */}
                  <div className="mt-5 max-w-3xl">
                    <p className="text-xl text-muted-foreground">
                      Keep track of your workouts and progress with ease. Sign
                      up now to get started.
                    </p>
                  </div>
                  {/* Buttons */}
                  <div className="mt-8 gap-3 flex justify-center">
                    <Button size={"lg"}>
                      {" "}
                      <Link to={"/signup"}>
                        <Text as="span" color="neutral.400">
                          Sign Up
                        </Text>
                        {/* or sign in */}
                      </Link>
                    </Button>
                    <Button
                      size={"lg"}
                      variant={"outline"}
                      onClick={async () => {
                        await handleGoogleSignIn();
                        setIsSignedIn(true);
                      }}
                      className="p-3  rounded-md"
                    >
                      Login
                    </Button>
                  </div>
                  {/* End Buttons */}
                </div>
              </div>
            </div>
          </div>
          {/* End Hero */}
        </>
      )}

      {/* <VStack spacing={8}>
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

        {isLoading ? (
          <Button isLoading>Loading...</Button>
        ) : isSignedIn ? (
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
        ) : (
          <span></span>
        )}
      </VStack> */}
    </Container>
  );
};

export default HomePage;
