import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Search } from "lucide-react";
import { Button } from "./ui/button";
import React, { useEffect, useRef, useState } from "react";
import { useScroll, motion } from "framer-motion";
import { cn } from "../lib/utils";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { PlusSquareIcon } from "@chakra-ui/icons";
import { useColorMode } from "@chakra-ui/react";
import { RxAvatar } from "react-icons/rx";
import { PiSignOutThin } from "react-icons/pi";
import { FiUsers } from "react-icons/fi";
import { MdArrowDropDown } from "react-icons/md";
import { HiShieldCheck } from "react-icons/hi";
import {
  Input,
  VStack,
  Text,
  Avatar,
  Spinner,
  Flex,
  Menu as ChakraMenu,
  MenuButton,
  MenuList,
  MenuItem,
  Box,
  Button as ChakraButton,
} from "@chakra-ui/react";
import { debounce } from "lodash";
import { API_ENDPOINTS, apiClient } from "../config/api";
import { useTheme } from "../contexts/ThemeContext";
import ThemeSelector from "./ThemeSelector";
import { useThemeColors } from "../hooks/useThemeColors";
import { useCustomToast } from "../hooks/useCustomToast";

export const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [isSignedIn, setIsSignedIn] = React.useState(false);
  const [uid, setUid] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [userName, setUserName] = React.useState("");
  const [entries, setEntries] = React.useState([]);
  const { scrollYProgress } = useScroll();
  const { colorMode } = useColorMode();
  const { currentTheme } = useTheme();
  const colors = useThemeColors();
  const toast = useCustomToast();
  const location = useLocation();
  const navigate = useNavigate();

  // Search-related states
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [hasTrainerDashboardAccess, setHasTrainerDashboardAccess] =
    React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState(false);
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
      setHasSearched(false);
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
      toast.error("Error", error.message || "Failed to search users");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  }, 300);

  // Handle profile click
  const handleProfileClick = (e, path) => {
    setSearchQuery("");
    setSearchResults([]);
    setHasSearched(false);
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
      setHasSearched(false);
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
        setHasTrainerDashboardAccess(false);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Check trainer dashboard access when user is signed in
  React.useEffect(() => {
    if (isSignedIn && uid) {
      const checkAccess = async () => {
        try {
          const response = await apiClient.get(
            API_ENDPOINTS.CHECK_TRAINER_DASHBOARD_ACCESS
          );
          if (response.data.success) {
            setHasTrainerDashboardAccess(response.data.hasAccess || false);
          }
        } catch (error) {
          // Default to false on error
          setHasTrainerDashboardAccess(false);
        }
      };
      checkAccess();
    }
  }, [isSignedIn, uid]);

  // Check admin status when user is signed in
  React.useEffect(() => {
    if (isSignedIn && uid) {
      const checkAdminStatus = async () => {
        try {
          const response = await apiClient.get(API_ENDPOINTS.CHECK_IS_ADMIN);
          if (response.data.success) {
            setIsAdmin(response.data.isAdmin || false);
          }
        } catch (error) {
          // Default to false on error
          setIsAdmin(false);
        }
      };
      checkAdminStatus();
    } else {
      setIsAdmin(false);
    }
  }, [isSignedIn, uid]);

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
        toast.warning(
          "Account Not Found",
          "No account found with this Google account. Please use Sign Up instead."
        );
        // Sign out the user since they don't have an account
        await signOut(auth);
        return;
      }

      if (mode === "signup" && userExists) {
        // User tried to signup but already has an account
        toast.info(
          "Account Already Exists",
          "An account already exists with this Google account. Please use Login instead."
        );
        // Don't sign out, let them stay logged in
        setIsSignedIn(true);
        return;
      }

      // If it's a signup, create the user account
      if (mode === "signup") {
        const response = await apiClient.post(API_ENDPOINTS.PROTECTED);
        const userData = response.data;
      }

      // Get current user data
      const userResponse = await apiClient.get(API_ENDPOINTS.GET_CURRENT_USER);
      const resultOne = userResponse.data;

      setIsSignedIn(true);

      // Show appropriate success message
      if (mode === "signup") {
        toast.success(
          "Account Created Successfully",
          "Welcome to Ethereal Gains! Your account has been created."
        );
      } else {
        toast.success(
          "Welcome Back",
          "Successfully logged in to your account."
        );
      }
    } catch (error) {
      toast.error(
        "Sign-in Failed",
        error.message || "Failed to sign in with Google"
      );
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setIsSignedIn(false);
      setUid(null);
      setEntries([]);
    } catch (error) {
      // Error signing out
    }
  };

  return (
    <header>
      <nav className="fixed z-20 w-full">
        <div
          className={cn(
            "mx-auto max-w-7xl px-6 py-[1px] transition-all duration-300 lg:px-12 backdrop-blur-2xl border-b",
            currentTheme === "light"
              ? "bg-background/80"
              : currentTheme === "dark"
              ? "bg-gray-900/80"
              : currentTheme === "dark-black"
              ? "bg-gray-950/90"
              : "bg-blue-950/90"
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
                onClick={closeMenu}
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
              {isSignedIn && (
                <div className="flex items-center gap-2 md:hidden">
                  {!isSearchOpen ? (
                    <ChakraButton
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsSearchOpen(true)}
                      color={colors.textSecondary}
                      _hover={{
                        bg: colors.bgHover,
                        color: colors.textPrimary,
                      }}
                      aria-label="Open search"
                    >
                      <Search className="h-5 w-5" />
                    </ChakraButton>
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
                          setHasSearched(false);
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
                            setHasSearched(false);
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
                      {searchQuery && (
                        <VStack
                          align="start"
                          spacing={2}
                          w={{ base: "full", md: "200px" }} // Full width on mobile
                          bg={colors.bgCard}
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
                                    _hover={{ bg: colors.bgHover }}
                                    p={2}
                                    w="full"
                                    bg={colors.bgCard}
                                  >
                                    <Avatar
                                      src={user.picture}
                                      size="sm"
                                      mr={2}
                                    />
                                    <Box flex={1}>
                                      <Text
                                        fontWeight={
                                          auth.currentUser &&
                                          user.uid === auth.currentUser.uid
                                            ? "bold"
                                            : "normal"
                                        }
                                        color={colors.textPrimary}
                                      >
                                        {user.name}
                                      </Text>
                                      {user.username &&
                                        user.username !== user.name && (
                                          <Text
                                            fontSize="xs"
                                            color={colors.textMuted}
                                          >
                                            @{user.username}
                                          </Text>
                                        )}
                                      {user.isPrivate && (
                                        <Text
                                          fontSize="xs"
                                          color={colors.textMuted}
                                        >
                                          Private Profile
                                        </Text>
                                      )}
                                    </Box>
                                  </Flex>
                                </Link>
                              );
                            })
                          ) : hasSearched && searchResults.length === 0 ? (
                            <Text w="full" color={colors.textSecondary}>
                              No users found
                            </Text>
                          ) : (
                            <Flex w="full" justify="center" align="center">
                              <Spinner size="xs" />
                            </Flex>
                          )}
                        </VStack>
                      )}
                    </div>
                  )}
                  <ChakraButton
                    variant="ghost"
                    size="sm"
                    color={colors.textSecondary}
                    _hover={{
                      bg: colors.bgHover,
                      color: colors.textPrimary,
                    }}
                    onClick={closeMenu}
                    as={Link}
                    to="/create"
                  >
                    <PlusSquareIcon className="h-4 w-4" />
                  </ChakraButton>
                </div>
              )}

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
            {isSignedIn && (
              <div className="hidden md:flex flex-1 justify-center items-center">
                <div className="relative flex items-center" ref={searchRef}>
                  <Input
                    borderRadius="16px"
                    placeholder="Search Users..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setHasSearched(false);
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
                  <ChakraButton
                    variant="ghost"
                    size="sm"
                    className="py-0 px-[8px] ml-2"
                    color={colors.textSecondary}
                    _hover={{
                      bg: colors.bgHover,
                      color: colors.textPrimary,
                    }}
                    aria-label="Search"
                  >
                    <Search className="h-5 w-5" />
                  </ChakraButton>
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setSearchResults([]);
                        setHasSearched(false);
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
                  {searchQuery && (
                    <VStack
                      align="start"
                      spacing={2}
                      w={{ base: "full", md: "200px" }}
                      bg={colors.bgCard}
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
                                _hover={{ bg: colors.bgHover }}
                                p={2}
                                w="full"
                                bg={colors.bgCard}
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
                                    color={colors.textPrimary}
                                  >
                                    {user.name}
                                  </Text>
                                  {user.username &&
                                    user.username !== user.name && (
                                      <Text
                                        fontSize="xs"
                                        color={colors.textMuted}
                                      >
                                        @{user.username}
                                      </Text>
                                    )}
                                  {user.isPrivate && (
                                    <Text
                                      fontSize="xs"
                                      color={colors.textMuted}
                                    >
                                      Private Profile
                                    </Text>
                                  )}
                                </Box>
                              </Flex>
                            </Link>
                          );
                        })
                      ) : hasSearched && searchResults.length === 0 ? (
                        <Text w="full" color={colors.textSecondary}>
                          No users found
                        </Text>
                      ) : (
                        <Flex w="full" justify="center" align="center">
                          <Spinner size="xs" />
                        </Flex>
                      )}
                    </VStack>
                  )}
                </div>
              </div>
            )}

            {/* Desktop Create and User Dropdown (Right-Aligned) */}
            <div className="hidden md:flex items-center gap-2">
              {isSignedIn && (
                <ChakraButton
                  variant="ghost"
                  size="sm"
                  color={colors.textSecondary}
                  _hover={{
                    bg: colors.bgHover,
                    color: colors.textPrimary,
                  }}
                  onClick={closeMenu}
                  as={Link}
                  to="/create"
                >
                  <PlusSquareIcon className="h-4 w-4" />
                </ChakraButton>
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
                    className="flex items-center justify-center"
                    px={2}
                    border="1px solid red" // Debug: Visualize button boundaries
                    color={
                      colors.currentTheme === "light"
                        ? "black"
                        : colors.textPrimary
                    }
                    _hover={{
                      bg: colors.bgHover,
                      color:
                        colors.currentTheme === "light"
                          ? "gray.900"
                          : colors.textPrimary,
                    }}
                  >
                    <Box display="flex" alignItems="center">
                      <Text
                        as="span"
                        fontSize="sm"
                        color={
                          colors.currentTheme === "light"
                            ? "gray.400"
                            : "gray.500"
                        }
                      >
                        @{userName}
                      </Text>
                      <Box
                        ml="4px"
                        display="inline-flex"
                        alignItems="center"
                        color={
                          colors.currentTheme === "light"
                            ? "gray.400"
                            : "gray.500"
                        }
                      >
                        <MdArrowDropDown
                          size="1.2rem"
                          style={{
                            color: "inherit",
                          }}
                        />
                      </Box>
                    </Box>
                  </MenuButton>
                  <MenuList bg={colors.bgCard} borderColor={colors.border}>
                    <MenuItem
                      as={Link}
                      to="/profile"
                      className="flex items-center gap-2"
                      bg={colors.bgCard}
                      color={colors.textSecondary}
                      _hover={{ bg: colors.bgHover }}
                    >
                      <RxAvatar className="!w-5 !h-5" />
                      Profile
                    </MenuItem>
                    <MenuItem
                      as={Link}
                      to="/analytics"
                      className="flex items-center gap-2"
                      bg={colors.bgCard}
                      color={colors.textSecondary}
                      _hover={{ bg: colors.bgHover }}
                    >
                      <Search className="!w-5 !h-5" />
                      Analytics
                    </MenuItem>
                    {hasTrainerDashboardAccess && (
                      <MenuItem
                        as={Link}
                        to="/trainer/dashboard"
                        className="flex items-center gap-2"
                        bg={colors.bgCard}
                        color={colors.textSecondary}
                        _hover={{ bg: colors.bgHover }}
                      >
                        <FiUsers className="!w-5 !h-5" />
                        Trainer Dashboard
                      </MenuItem>
                    )}
                    {isAdmin && (
                      <MenuItem
                        as={Link}
                        to="/admin/dashboard"
                        className="flex items-center gap-2"
                        bg={colors.bgCard}
                        color={colors.textSecondary}
                        _hover={{ bg: colors.bgHover }}
                      >
                        <HiShieldCheck className="!w-5 !h-5" />
                        Admin Dashboard
                      </MenuItem>
                    )}
                    <MenuItem
                      onClick={handleSignOut}
                      className="flex items-center gap-2"
                      bg={colors.bgCard}
                      color={colors.textSecondary}
                      _hover={{ bg: colors.bgHover }}
                    >
                      <PiSignOutThin />
                      Sign Out
                    </MenuItem>
                    <MenuItem
                      bg={colors.bgCard}
                      color={colors.textSecondary}
                      _hover={{ bg: colors.bgHover }}
                      className="flex items-center gap-2"
                      onClick={closeMenu}
                    >
                      <ThemeSelector onThemeChange={closeMenu} />
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
                    {hasTrainerDashboardAccess && (
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
                        <Link
                          to="/trainer/dashboard"
                          className="flex items-center gap-2"
                        >
                          <FiUsers className="!w-5 !h-5" />
                          <span>Trainer Dashboard</span>
                        </Link>
                      </Button>
                    )}
                    {isAdmin && (
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
                        <Link
                          to="/admin/dashboard"
                          className="flex items-center gap-2"
                        >
                          <HiShieldCheck className="!w-5 !h-5" />
                          <span>Admin Dashboard</span>
                        </Link>
                      </Button>
                    )}
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
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "w-full justify-center",
                        colorMode === "light"
                          ? "text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                          : "text-gray-500 hover:text-blue-400 hover:bg-gray-200"
                      )}
                      onClick={closeMenu}
                    >
                      <ThemeSelector
                        onThemeChange={closeMenu}
                        className="w-full"
                      />
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
