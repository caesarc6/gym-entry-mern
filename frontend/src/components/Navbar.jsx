import {
  Container,
  Flex,
  Text,
  Button,
  HStack,
  useColorMode,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { PlusSquareIcon } from "@chakra-ui/icons";
import { IoMoon } from "react-icons/io5";
import { LuSun } from "react-icons/lu";
import { useState, useEffect } from "react";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { API_ENDPOINTS, apiClient } from "../config/api";
import ThemeSelector from "./ThemeSelector";
import { useCustomToast } from "../hooks/useCustomToast";

const Navbar = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [entries, setEntries] = useState([]);
  const [uid, setUid] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  const toast = useCustomToast();

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
      }
      setIsLoading(false); // Set loading to false once we know the auth state
    });

    return () => unsubscribe(); // Cleanup subscription
  }, []);

  const checkUserExists = async () => {
    try {
      const userCheckResponse = await apiClient.get(
        API_ENDPOINTS.GET_CURRENT_USER
      );
      const userExists = userCheckResponse.status === 200;
      return userExists;
    } catch (error) {
      return false;
    }
  };

  const handleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      const response = await apiClient.post(API_ENDPOINTS.PROTECTED);

      const userData = response.data;
      const currentUserResponse = await apiClient.get(
        API_ENDPOINTS.GET_CURRENT_USER
      );

      const currentUserData = currentUserResponse.data;
    } catch (error) {
      handleSignOut();
      toast.error("Error", error.message || "Failed to sign in");
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      setUid(null);
      setIsSignedIn(false);
    } catch (error) {
      toast.error("Error", error.message || "Failed to sign out");
    }
  };

  const checkCurrentUser = async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.GET_CURRENT_USER);
      const currentUserData = response.data;
    } catch (error) {}
  };

  const handleGoogleSignIn = async (mode = "login") => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();

      // First, check if user already exists in our database
      const userExists = await checkUserExists();

      if (mode === "login" && !userExists) {
        // User tried to login but doesn't have an account
        alert(
          "No account found with this Google account. Please use Sign Up instead."
        );
        // Sign out the user since they don't have an account
        await signOut(auth);
        return;
      }

      if (mode === "signup" && userExists) {
        // User tried to signup but already has an account
        alert(
          "An account already exists with this Google account. Please use Login instead."
        );
        // Don't sign out, let them stay logged in
        setIsSignedIn(true);
        return;
      }

      // If it's a signup, create the user account
      if (mode === "signup") {
        const response = await apiClient.post(API_ENDPOINTS.PROTECTED);
        if (response.status !== 200) {
          throw new Error(await response.text());
        }
        const userData = response.data;
      }

      await checkCurrentUser();
    } catch (error) {
      // clear feed and user sign in state to sign out
      handleSignOut();
    }
  };

  return (
    <Container
      backgroundColor={colorMode === "light" ? "#071f3278" : "#13151775"}
      // backgroundColor={"#071f3278"}
      maxW={"100%"}
      position={"fixed"}
      p={0}
      m={0}
      height={"90px"}
      zIndex={1}
      justifySelf={"anchor-center"}
      display={"flex"}
    >
      <Container
        // backgroundColor={"grey"}
        alignContent={"center"}
        maxW={"1140px"}
        px={4}
        // position={"fixed"}
        zIndex={1}
        justifySelf={"anchor-center"}
      >
        <Flex
          h={16}
          alignItems={"center"}
          justifyContent={"space-between"}
          flexDir={{ base: "column", sm: "row" }}
        >
          <Text
            fontSize={{ base: "22", md: "28" }}
            // fontWeight="bold"
            textTransform={"uppercase"}
            textAlign={"center"}
            bgGradient={"linear(to-r, blue.300, gray.400)"}
            bgClip={"text"}
          >
            <Link to={"/"}>Ethereal Gains </Link>
          </Text>
          <HStack spacing={2} alignItems={"center"}>
            {isSignedIn ? (
              <Link to={"/create"}>
                <Button size={"sm"}>
                  <PlusSquareIcon fontSize={20} />
                </Button>
              </Link>
            ) : (
              <>
                {/* <span>Login SignUp</span> */}
                {/* <Button className="p-0 m-0" size={"sm"}>
                  {" "}
                  <Link to={"/signup"}>
                    <Text as="span" color="neutral.400">
                      Sign Up
                    </Text>

                  </Link>
                </Button> */}
                <Button
                  size={"xs"}
                  // variant={"outline"}
                  onClick={async () => {
                    await handleGoogleSignIn("signup");
                    setIsSignedIn(true);
                  }}
                  className="p-3  rounded-md"
                >
                  <Text as="span" color="neutral.400">
                    Sign Up
                  </Text>
                </Button>
                <Button
                  size={"xs"}
                  variant={"outline"}
                  onClick={async () => {
                    await handleGoogleSignIn("login");
                    setIsSignedIn(true);
                  }}
                  className="p-0 m-0  rounded-md"
                >
                  Login
                </Button>
              </>
            )}
            <ThemeSelector />
          </HStack>
        </Flex>
      </Container>
    </Container>
  );
};

export default Navbar;
