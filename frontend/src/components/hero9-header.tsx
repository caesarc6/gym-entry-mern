import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import React, { useEffect, useRef, useState } from "react";
import { useScroll, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { PlusSquareIcon } from "@chakra-ui/icons";
import { IoMoon } from "react-icons/io5";
import { LuSun } from "react-icons/lu";
import { useColorMode } from "@chakra-ui/react";
import { RxAvatar } from "react-icons/rx";
import { PiSignOutThin } from "react-icons/pi";
import { MdPrivacyTip } from "react-icons/md";
import { MdArrowDropDown } from "react-icons/md";
import {
  Input,
  VStack,
  Text,
  Avatar,
  Spinner,
  useToast,
  Flex,
  Menu as ChakraMenu,
  MenuButton,
  MenuList,
  MenuItem,
  Box,
} from "@chakra-ui/react";
import { debounce } from "lodash";
import { API_ENDPOINTS, apiClient } from "../config/api";

export const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [isSignedIn, setIsSignedIn] = React.useState(false);
  const [uid, setUid] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [userName, setUserName] = React.useState("");
  const [entries, setEntries] = React.useState([]);
  const { scrollYProgress } = useScroll();
  const { colorMode, toggleColorMode } = useColorMode();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  // Search-related states
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  // Function to close the mobile menu
  const closeMenu = () => setMenuState(false);

  // Modified handlers that combine existing functionality with menu closing
  const handleSignOutAndClose = async () => {
    await handleSignOut();
    closeMenu();
  };

  const handleGoogleSignInAndClose = async (mode = "login") => {
    await handleGoogleSignIn(mode);
    closeMenu();
  };

  const handleToggleColorModeAndClose = () => {
    toggleColorMode();
    closeMenu();
  };

  // Animation variants for the mobile menu
  const menuVariants = {
    closed: { y: -20, opacity: 0 },
    open: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.3, ease: "easeInOut" },
    },
  };

  // Search users function
  const searchUsers = debounce(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");

      const response = await apiClient.get(API_ENDPOINTS.SEARCH_USERS(query));
      const data = response.data;
      setSearchResults(data.data || []);
    } catch (error) {
      console.error("Error searching users:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to search users",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, 300);

  // Handle profile click
  const handleProfileClick = (e, path) => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearchOpen(false);
    navigate(path);
  };

  // Handle click-away to clear search
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        (searchRef.current && searchRef.current.contains(event.target)) ||
        (dropdownRef.current && dropdownRef.current.contains(event.target)) ||
        event.target.closest('button[aria-label="Toggle search"]') ||
        event.target.closest("input") ||
        event.target.closest("a")
      ) {
        return;
      }
      setSearchQuery("");
      setSearchResults([]);
      setIsSearchOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsSignedIn(true);
        setUid(user.uid);
        setUserName(user.displayName || "User");
      } else {
        setIsSignedIn(false);
        setUid(null);
        setUserName("");
        setEntries([]);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      setScrolled(latest > 0.05);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  const handleGoogleSignIn = async (mode = "login") => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();

      // First, check if user already exists in our database
      const userCheckResponse = await apiClient.get(
        API_ENDPOINTS.GET_CURRENT_USER
      );

      const userExists = userCheckResponse.status === 200;

      if (mode === "login" && !userExists) {
        // User tried to login but doesn't have an account
        toast({
          title: "Account Not Found",
          description:
            "No account found with this Google account. Please use Sign Up instead.",
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
        // Sign out the user since they don't have an account
        await signOut(auth);
        return;
      }

      if (mode === "signup" && userExists) {
        // User tried to signup but already has an account
        toast({
          title: "Account Already Exists",
          description:
            "An account already exists with this Google account. Please use Login instead.",
          status: "info",
          duration: 5000,
          isClosable: true,
        });
        // Don't sign out, let them stay logged in
        setIsSignedIn(true);
        return;
      }

      // If it's a signup, create the user account
      if (mode === "signup") {
        const response = await apiClient.post(API_ENDPOINTS.PROTECTED);
        const userData = response.data;
        console.log("New user created:", userData);
      }

      // Get current user data
      const userResponse = await apiClient.get(API_ENDPOINTS.GET_CURRENT_USER);
      const resultOne = userResponse.data;

      setIsSignedIn(true);

      // Show appropriate success message
      if (mode === "signup") {
        toast({
          title: "Account Created Successfully",
          description:
            "Welcome to Ethereal Gains! Your account has been created.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Welcome Back",
          description: "Successfully logged in to your account.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
      toast({
        title: "Sign-in Failed",
        description: error.message || "Failed to sign in with Google",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setIsSignedIn(false);
      setUid(null);
      setEntries([]);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <header>
      <nav className="fixed z-20 w-full">
        <div
          className={cn(
            "mx-auto max-w-7xl px-6 py-[1px] transition-all duration-300 lg:px-12 backdrop-blur-2xl border-b",
            colorMode === "dark" ? "bg-gray-900/80" : "bg-background/80"
          )}
        >
          <motion.div
            className={cn(
              "relative flex items-center justify-between gap-4 py-3 duration-200 lg:gap-4 lg:py-6  flex-wrap sm:flex-wrap",
              scrolled && "lg:py-4"
            )}
          >
            {/* Logo and Hamburger */}
            <div className="flex items-center gap-4">
              <a
                href="/"
                aria-label="home"
                className="flex items-center space-x-2"
              >
                <span
                  className={cn(
                    "text-xl md:text-2xl uppercase bg-gradient-to-r from-blue-300 to-gray-400 bg-clip-text text-transparent"
                  )}
                >
                  Ethereal Gains
                </span>
              </a>
            </div>

            <div className="flex items-center gap-4">
              {/* Mobile Search and Create */}
              <div className="flex items-center gap-2 md:hidden">
                {!isSearchOpen ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSearchOpen(true)}
                    className={cn(
                      colorMode === "light"
                        ? "text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                        : "text-gray-500 hover:text-blue-300 hover:bg-gray-800"
                    )}
                    aria-label="Open search"
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                ) : (
                  <div
                    className="relative flex items-center gap-2"
                    ref={searchRef}
                  >
                    <Input
                      borderRadius="16px"
                      placeholder="Search Users..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        searchUsers(e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      size="sm"
                      autoFocus
                      className={cn(
                        colorMode === "light"
                          ? "bg-gray-100 text-gray-700"
                          : "bg-gray-700 text-gray-200",
                        "!w-[111px]"
                      )}
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearchQuery("");
                          setSearchResults([]);
                          setIsSearchOpen(false);
                        }}
                        className={cn(
                          "px-1",
                          colorMode === "light"
                            ? "text-gray-500 hover:text-gray-700"
                            : "text-gray-400 hover:text-gray-200"
                        )}
                        aria-label="Clear search"
                      >
                        <X className="h-1 w-1" />
                      </Button>
                    )}
                    {isSearching && <Spinner size="sm" className="ml-2" />}
                    {(searchResults.length > 0 ||
                      (searchQuery &&
                        !isSearching &&
                        searchResults.length === 0)) && (
                      <VStack
                        align="start"
                        spacing={2}
                        w={{ base: "full", md: "200px" }} // Full width on mobile
                        bg={colorMode === "light" ? "white" : "gray.800"}
                        p={4}
                        borderRadius="md"
                        boxShadow="md"
                        position="absolute"
                        top="40px"
                        left="0"
                        right="0" // Ensure it spans the available width
                        zIndex="50"
                        ref={dropdownRef}
                      >
                        {searchResults.length > 0 ? (
                          searchResults.map((user) => {
                            const path =
                              auth.currentUser &&
                              user.uid === auth.currentUser.uid
                                ? "/profile"
                                : `/user/${user.uid}`;
                            return (
                              <Link
                                key={user.uid}
                                to={path}
                                onClick={(e) => handleProfileClick(e, path)}
                                aria-label={`View ${user.name}'s profile`}
                                style={{ display: "block", width: "100%" }}
                              >
                                <Flex
                                  align="center"
                                  _hover={{ bg: "gray.100" }}
                                  p={2}
                                  w="full"
                                >
                                  <Avatar src={user.picture} size="sm" mr={2} />
                                  <Box flex={1}>
                                    <Text
                                      fontWeight={
                                        auth.currentUser &&
                                        user.uid === auth.currentUser.uid
                                          ? "bold"
                                          : "normal"
                                      }
                                    >
                                      {user.name}
                                    </Text>
                                    {user.username &&
                                      user.username !== user.name && (
                                        <Text fontSize="xs" color="gray.500">
                                          @{user.username}
                                        </Text>
                                      )}
                                    {user.isPrivate && (
                                      <Text fontSize="xs" color="gray.400">
                                        Private Profile
                                      </Text>
                                    )}
                                  </Box>
                                </Flex>
                              </Link>
                            );
                          })
                        ) : (
                          <Text w="full">No users found</Text>
                        )}
                      </VStack>
                    )}
                  </div>
                )}
                {isSignedIn && (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className={cn(
                      colorMode === "light"
                        ? "text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                        : "text-gray-500 hover:text-blue-300 hover:bg-gray-800"
                    )}
                  >
                    <Link to="/create">
                      <PlusSquareIcon className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>

              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState ? "Close Menu" : "Open Menu"}
                className="relative z-20 -m-2.5 block cursor-pointer p-2.5 md:hidden"
              >
                <span className="relative block size-6">
                  <Menu
                    className={cn(
                      "absolute inset-0 m-auto size-6 transition-transform duration-300 ease-in-out",
                      menuState
                        ? "rotate-90 opacity-0 scale-0"
                        : "rotate-0 opacity-100 scale-100"
                    )}
                  />
                  <X
                    className={cn(
                      "absolute inset-0 m-auto size-6 transition-transform duration-300 ease-in-out",
                      menuState
                        ? "rotate-0 opacity-100 scale-100"
                        : "-rotate-90 opacity-0 scale-0"
                    )}
                  />
                </span>
              </button>
            </div>

            {/* Desktop Centered Search */}
            <div className="hidden md:flex flex-1 justify-center items-center">
              <div className="relative flex items-center" ref={searchRef}>
                <Input
                  borderRadius="16px"
                  placeholder="Search Users..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  size="sm"
                  minWidth="90px"
                  maxWidth={{
                    base: "99px",
                    sm: "99px",
                    md: "300px",
                    lg: "300px",
                  }}
                  width="full"
                  className={cn(
                    colorMode === "light"
                      ? "bg-gray-100 text-gray-700"
                      : "bg-gray-700 text-gray-200",
                    "pr-8"
                  )}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "py-0 px-[8px] ml-2",
                    colorMode === "light"
                      ? "text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                      : "text-gray-500 hover:text-blue-300 hover:bg-gray-800"
                  )}
                  aria-label="Search"
                >
                  <Search className="h-5 w-5" />
                </Button>
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                    className={cn(
                      "absolute right-10 top-1/2 -translate-y-1/2 py-[0px] px-1",
                      colorMode === "light"
                        ? "text-gray-500 hover:text-gray-700"
                        : "text-gray-400 hover:text-gray-200"
                    )}
                  >
                    <X className="h-1 w-2" />
                  </Button>
                )}
                {isSearching && (
                  <Spinner
                    size="sm"
                    position="absolute"
                    right="14px"
                    top="50%"
                    transform="translateY(-50%)"
                  />
                )}
                {(searchResults.length > 0 ||
                  (searchQuery &&
                    !isSearching &&
                    searchResults.length === 0)) && (
                  <VStack
                    align="start"
                    spacing={2}
                    w={{ base: "full", md: "200px" }}
                    bg={colorMode === "light" ? "white" : "gray.800"}
                    p={4}
                    borderRadius="md"
                    boxShadow="md"
                    position="absolute"
                    top="40px"
                    left="0"
                    zIndex="50"
                    ref={dropdownRef}
                  >
                    {searchResults.length > 0 ? (
                      searchResults.map((user) => {
                        const path =
                          auth.currentUser && user.uid === auth.currentUser.uid
                            ? "/profile"
                            : `/user/${user.uid}`;
                        return (
                          <Link
                            key={user.uid}
                            to={path}
                            onClick={(e) => handleProfileClick(e, path)}
                            aria-label={`View ${user.name}'s profile`}
                            style={{ display: "block", width: "100%" }}
                          >
                            <Flex
                              align="center"
                              _hover={{ bg: "gray.100" }}
                              p={2}
                              w="full"
                            >
                              <Avatar src={user.picture} size="sm" mr={2} />
                              <Box flex={1}>
                                <Text
                                  fontWeight={
                                    auth.currentUser &&
                                    user.uid === auth.currentUser.uid
                                      ? "bold"
                                      : "normal"
                                  }
                                >
                                  {user.name}
                                </Text>
                                {user.username &&
                                  user.username !== user.name && (
                                    <Text fontSize="xs" color="gray.500">
                                      @{user.username}
                                    </Text>
                                  )}
                                {user.isPrivate && (
                                  <Text fontSize="xs" color="gray.400">
                                    Private Profile
                                  </Text>
                                )}
                              </Box>
                            </Flex>
                          </Link>
                        );
                      })
                    ) : (
                      <Text w="full">No users found</Text>
                    )}
                  </VStack>
                )}
              </div>
            </div>

            {/* Desktop Create and User Dropdown (Right-Aligned) */}
            <div className="hidden md:flex items-center gap-2">
              {isSignedIn && (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className={cn(
                    colorMode === "light"
                      ? "text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                      : "text-gray-500 hover:text-blue-300 hover:bg-gray-800"
                  )}
                >
                  <Link to="/create">
                    <PlusSquareIcon className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              {isLoading ? (
                <Button
                  disabled
                  size="sm"
                  className={cn(
                    colorMode === "light"
                      ? "bg-gray-200 text-gray-700"
                      : "bg-gray-700 text-gray-200"
                  )}
                >
                  Loading...
                </Button>
              ) : isSignedIn ? (
                <ChakraMenu>
                  <MenuButton
                    as={Button}
                    variant="ghost"
                    size="sm"
                    display="flex"
                    px={2}
                    border="1px solid red" // Debug: Visualize button boundaries
                    className={cn(
                      colorMode === "light"
                        ? "text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                        : "text-gray-500 hover:text-blue-300 hover:bg-gray-800"
                    )}
                  >
                    <Box display="flex">
                      <Text as="span" fontSize="sm">
                        @{userName}
                      </Text>
                      <MdArrowDropDown
                        size="1.2rem"
                        style={{ marginLeft: "4px" }}
                      />
                    </Box>
                  </MenuButton>
                  <MenuList
                    bg={colorMode === "light" ? "white" : "gray.700"}
                    borderColor={
                      colorMode === "light" ? "gray.200" : "gray.700"
                    }
                  >
                    <MenuItem
                      as={Link}
                      to="/profile"
                      className="flex items-center gap-2"
                    >
                      <RxAvatar className="!w-5 !h-5" />
                      Profile
                    </MenuItem>
                    <MenuItem
                      as={Link}
                      to="/analytics"
                      className="flex items-center gap-2"
                    >
                      <Search className="!w-5 !h-5" />
                      Analytics
                    </MenuItem>
                    <MenuItem
                      as={Link}
                      to="/privacy"
                      className="flex items-center gap-2"
                    >
                      <MdPrivacyTip className="!w-5 !h-5" />
                      Privacy Settings
                    </MenuItem>
                    <MenuItem
                      onClick={handleSignOut}
                      className="flex items-center gap-2"
                    >
                      <PiSignOutThin />
                      Sign Out
                    </MenuItem>
                    <MenuItem
                      onClick={toggleColorMode}
                      className="flex items-center gap-2"
                    >
                      {colorMode === "light" ? (
                        <IoMoon size={20} />
                      ) : (
                        <LuSun size={20} />
                      )}
                      {colorMode === "light" ? "Dark Mode" : "Light Mode"}
                    </MenuItem>
                  </MenuList>
                </ChakraMenu>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleGoogleSignInAndClose("login")}
                    className={cn(
                      colorMode === "light"
                        ? "text-gray-700 hover:bg-gray-100 bg-stone-100"
                        : "text-gray-200 hover:bg-gray-700"
                    )}
                  >
                    Login
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleGoogleSignInAndClose("signup")}
                    className={cn(
                      colorMode === "light"
                        ? "text-gray-500 bg-inherit hover:bg-gray-200 bg-stone-100"
                        : "text-gray-200 hover:text-blue-400 hover:bg-gray-200"
                    )}
                  >
                    Sign Up
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Menu */}
            <motion.div
              variants={menuVariants}
              initial="closed"
              animate={menuState ? "open" : "closed"}
              className={cn(
                "w-full md:hidden",
                menuState
                  ? "block bg-background mb-6 rounded-xl border p-6 shadow-2xl shadow-zinc-400/20 mt-4"
                  : "hidden"
              )}
            >
              <div className="mt-1 flex flex-col space-y-3">
                {isLoading ? (
                  <Button
                    disabled
                    size="sm"
                    className={cn(
                      colorMode === "light"
                        ? "bg-gray-200 text-gray-700"
                        : "bg-gray-700 text-gray-200"
                    )}
                  >
                    Loading...
                  </Button>
                ) : isSignedIn ? (
                  <>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className={cn(
                        colorMode === "light"
                          ? "text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                          : "text-gray-500 hover:text-blue-400 hover:bg-gray-200"
                      )}
                      onClick={closeMenu}
                    >
                      <Link to="/profile" className="flex items-center gap-2">
                        <RxAvatar className="!w-5 !h-5" />
                        <span>Profile</span>
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className={cn(
                        colorMode === "light"
                          ? "text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                          : "text-gray-500 hover:text-blue-400 hover:bg-gray-200"
                      )}
                      onClick={closeMenu}
                    >
                      <Link to="/analytics" className="flex items-center gap-2">
                        <Search className="!w-5 !h-5" />
                        <span>Analytics</span>
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className={cn(
                        colorMode === "light"
                          ? "text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                          : "text-gray-500 hover:text-blue-400 hover:bg-gray-200"
                      )}
                      onClick={closeMenu}
                    >
                      <Link to="/privacy" className="flex items-center gap-2">
                        <MdPrivacyTip className="!w-5 !h-5" />
                        <span>Privacy Settings</span>
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSignOutAndClose}
                      className={cn(
                        colorMode === "light"
                          ? "text-gray-500 bg-inherit hover:bg-gray-200"
                          : "text-gray-500 hover:text-blue-400 hover:bg-gray-200"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <PiSignOutThin />
                        <span>Sign Out</span>
                      </div>
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleToggleColorModeAndClose}
                      className={cn(
                        colorMode === "light"
                          ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          : "bg-gray-700 text-gray-200 hover:bg-gray-600"
                      )}
                    >
                      {colorMode === "light" ? (
                        <IoMoon size={20} />
                      ) : (
                        <LuSun size={20} />
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleGoogleSignInAndClose("login")}
                      className={cn(
                        colorMode === "light"
                          ? "text-gray-500 bg-inherit hover:bg-gray-200"
                          : "text-gray-500 hover:text-blue-400 hover:bg-gray-200"
                      )}
                    >
                      Login
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleGoogleSignInAndClose("signup")}
                      className={cn(
                        colorMode === "light"
                          ? "text-gray-500 bg-inherit hover:bg-gray-200"
                          : "text-gray-500 hover:text-blue-400 hover:bg-gray-200"
                      )}
                    >
                      Sign Up
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </nav>
    </header>
  );
};
