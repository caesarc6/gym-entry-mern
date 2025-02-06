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

import { signInWithPopup } from "firebase/auth";

const Navbar = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [entries, setEntries] = useState([]);
  const [uid, setUid] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Add loading state

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

  return (
    <Container
      backgroundColor={"#071f3278"}
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
                    await handleGoogleSignIn();
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
                    await handleGoogleSignIn();
                    setIsSignedIn(true);
                  }}
                  className="p-0 m-0  rounded-md"
                >
                  Login
                </Button>
              </>
            )}
            <Button size={"sm"} onClick={toggleColorMode}>
              {colorMode === "light" ? <IoMoon /> : <LuSun size="20" />}
            </Button>
          </HStack>
        </Flex>
      </Container>
    </Container>
  );
};

export default Navbar;
