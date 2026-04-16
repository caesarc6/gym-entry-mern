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
import { supabase } from "../supabase/supabase";
import ThemeSelector from "./ThemeSelector";
import { useCustomToast } from "../hooks/useCustomToast";
import { getCurrentAuthUser, signOutAll } from "../utils/auth";

const Navbar = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [entries, setEntries] = useState([]);
  const [uid, setUid] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  const toast = useCustomToast();

  // Add this useEffect to handle initial auth state (both Firebase and Supabase)
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const user = await getCurrentAuthUser();
        if (user) {
          setIsSignedIn(true);
          setUid(user.uid);
        } else {
          setIsSignedIn(false);
          setUid(null);
          setEntries([]);
        }
      } catch (error) {
        setIsSignedIn(false);
        setUid(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Check initial auth state
    checkAuthState();

    // Listen to Supabase auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setIsSignedIn(true);
        setUid(session.user.id);
      } else if (event === "SIGNED_OUT") {
        checkAuthState();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOutAll();
      setUid(null);
      setIsSignedIn(false);
      setEntries([]);
    } catch (error) {
      toast.error("Error", error.message || "Failed to sign out");
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
      pt={"env(safe-area-inset-top)"}
      height={"calc(90px + env(safe-area-inset-top))"}
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
                  className="p-3  rounded-md"
                  as={Link}
                  to="/signup"
                >
                  <Text as="span" color="neutral.400">
                    Sign Up
                  </Text>
                </Button>
                <Button
                  size={"xs"}
                  variant={"outline"}
                  className="p-0 m-0  rounded-md"
                  as={Link}
                  to="/login"
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
