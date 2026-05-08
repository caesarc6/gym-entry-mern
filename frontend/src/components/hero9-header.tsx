import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Search } from "lucide-react";
import { Button } from "./ui/button";
import React, { useCallback, useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useScroll } from "framer-motion";
import { cn } from "../lib/utils";
import {
  HERO_OUTLINE_CTA_BUTTON_CLASSNAME,
  NAV_OUTLINE_AUTH_BUTTON_LIGHT_CLASSNAME,
} from "../lib/heroCtaButtonClasses";
import { supabase } from "../supabase/supabase";
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
import { useCanvasShell, hexAlpha } from "../contexts/CanvasShellContext.jsx";
import ThemeSelector from "./ThemeSelector";
import { useThemeColors } from "../hooks/useThemeColors";
import { useCustomToast } from "../hooks/useCustomToast";
import { getCurrentAuthUser, signOutAll } from "../utils/auth";

export const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [isSignedIn, setIsSignedIn] = React.useState(false);
  const [uid, setUid] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [userName, setUserName] = React.useState("");
  const [currentUser, setCurrentUser] = React.useState(null);
  const [entries, setEntries] = React.useState([]);
  const { scrollYProgress } = useScroll();
  const { colorMode } = useColorMode();
  const { currentTheme, setTheme } = useTheme();
  const { paintHex, prefersReducedMotion, transition: canvasTransition } =
    useCanvasShell();
  const colors = useThemeColors();
  const toast = useCustomToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";

  const authNavOutlineClassName =
    !isHome && currentTheme === "light"
      ? NAV_OUTLINE_AUTH_BUTTON_LIGHT_CLASSNAME
      : HERO_OUTLINE_CTA_BUTTON_CLASSNAME;

  const isLightTheme = currentTheme === "light";

  /** Mobile drawer follows the app theme, not Chakra's color mode. */
  const mobileMenuAuthOutlineClassName =
    isLightTheme
      ? NAV_OUTLINE_AUTH_BUTTON_LIGHT_CLASSNAME
      : HERO_OUTLINE_CTA_BUTTON_CLASSNAME;

  const lightNavSurface = !isHome && currentTheme === "light";
  const mobileDrawerSurfaceClassName =
    currentTheme === "light"
      ? "border-zinc-200 bg-white/90 text-zinc-900 shadow-zinc-900/20 backdrop-blur-xl"
      : currentTheme === "dark-blue"
        ? "border-blue-300/10 bg-slate-950/95 text-blue-50 shadow-black/40 backdrop-blur-xl"
        : "border-white/10 bg-zinc-950/95 text-zinc-100 shadow-black/40 backdrop-blur-xl";
  const mobileDrawerOptionTextClassName = "text-xs font-medium";
  const mobileDrawerItemClassName = cn(
    mobileDrawerOptionTextClassName,
    isLightTheme
      ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
      : currentTheme === "dark-blue"
        ? "text-blue-100/80 hover:text-blue-100 hover:bg-blue-400/10"
        : "text-gray-300 hover:text-blue-300 hover:bg-white/10",
  );
  const mobileDrawerLoadingClassName = isLightTheme
    ? "bg-gray-200 text-gray-700"
    : "bg-white/10 text-gray-200";

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
  const navRef = useRef(null);
  const drawerRef = useRef(null);
  const authSyncGenerationRef = useRef(0);
  const skipNextPathnameAuthSyncRef = useRef(true);

  // Function to close the mobile menu
  const closeMenu = () => setMenuState(false);

  // Modified handlers that combine existing functionality with menu closing
  const handleSignOutAndClose = async () => {
    await handleSignOut();
    closeMenu();
  };

  // Animation variants for the mobile menu
  const backdropVariants = {
    closed: { opacity: 0 },
    open: { opacity: 1, transition: { duration: 0.2, ease: "easeOut" } },
  };
  const drawerVariants = {
    closed: { x: "100%" },
    open: {
      x: 0,
      transition: { duration: 0.28, ease: "easeOut" },
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
      if (!currentUser) throw new Error("User not authenticated");

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

  // Close mobile menu when tapping / clicking outside the nav (drawer + top bar)
  useEffect(() => {
    if (!menuState) return;

    const handlePointerDown = (event) => {
      const target = event.target;
      const clickedNav = navRef.current && navRef.current.contains(target);
      const clickedDrawer =
        drawerRef.current && drawerRef.current.contains(target);

      if (!clickedNav && !clickedDrawer) {
        setMenuState(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [menuState]);

  useEffect(() => {
    if (!menuState) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuState(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuState]);

  const syncAuthState = useCallback(async (showFullLoading = true) => {
    const gen = ++authSyncGenerationRef.current;
    if (showFullLoading) {
      setIsLoading(true);
    }
    try {
      const user = await getCurrentAuthUser();
      if (gen !== authSyncGenerationRef.current) return;
      if (user) {
        setIsSignedIn(true);
        setUid(user.uid);
        setUserName(user.name || "User");
        setCurrentUser(user);
      } else {
        setIsSignedIn(false);
        setUid(null);
        setUserName("");
        setEntries([]);
        setHasTrainerDashboardAccess(false);
        setCurrentUser(null);
      }
    } finally {
      if (gen === authSyncGenerationRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  React.useEffect(() => {
    void syncAuthState(true);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const user = {
          uid: session.user.id,
          email: session.user.email,
          name:
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            session.user.email?.split("@")[0],
          picture:
            session.user.user_metadata?.avatar_url ||
            session.user.user_metadata?.picture ||
            "",
          authProvider: "supabase",
        };
        setIsSignedIn(true);
        setUid(user.uid);
        setUserName(user.name || "User");
        setCurrentUser(user);
        setIsLoading(false);
      } else {
        void syncAuthState(false);
      }
    });

    const unsubFirebase = onAuthStateChanged(auth, () => {
      void syncAuthState(false);
    });

    return () => {
      subscription.unsubscribe();
      unsubFirebase();
    };
  }, [syncAuthState]);

  // After login/signup/OAuth, route changes can happen before Supabase events reach this component;
  // re-resolve the user from storage without flashing the full nav loading state.
  React.useEffect(() => {
    if (skipNextPathnameAuthSyncRef.current) {
      skipNextPathnameAuthSyncRef.current = false;
      return;
    }
    void syncAuthState(false);
  }, [location.pathname, syncAuthState]);

  // Check trainer dashboard access when user is signed in
  React.useEffect(() => {
    if (isSignedIn && uid) {
      const checkAccess = async () => {
        try {
          const response = await apiClient.get(
            API_ENDPOINTS.CHECK_TRAINER_DASHBOARD_ACCESS,
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

  const handleAuthNavigate = (path) => {
    navigate(path);
    closeMenu();
  };

  const handleSignOut = async () => {
    try {
      await signOutAll();
      setIsSignedIn(false);
      setUid(null);
      setEntries([]);
      setCurrentUser(null);
    } catch (error) {
      // Error signing out
    }
  };

  return (
    <header>
      <nav ref={navRef} className="fixed z-20 w-full">
        <div
          className={cn(
            "mx-auto max-w-7xl border-b px-6 py-[1px] pt-[constant(safe-area-inset-top)] pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:px-12",
            isHome
              ? "border-[rgb(39_39_42_/_6%)]"
              : currentTheme === "light"
                ? "border-zinc-200/80 shadow-sm"
                : currentTheme === "dark-black"
                  ? "border-neutral-800/55"
                  : currentTheme === "dark-blue"
                    ? "border-[rgb(39_39_42_/_6%)]"
                    : "border-[rgb(39_39_42_/_6%)]",
          )}
          style={{
            backgroundColor: hexAlpha(
              paintHex,
              !isHome && currentTheme === "light" ? 0.92 : 0.88
            ),
            transition: prefersReducedMotion ? undefined : canvasTransition,
          }}
        >
          <motion.div
            className={cn(
              "relative flex items-center justify-between gap-4 py-2 duration-200 lg:gap-4 lg:py-4 flex-wrap sm:flex-wrap",
              scrolled && "lg:py-3",
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
                <span className="text-xl md:text-2xl uppercase bg-gradient-to-r from-blue-300 to-gray-400 bg-clip-text text-transparent">
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
                          "!w-[111px]",
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
                              : "text-gray-400 hover:text-gray-200",
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
                                currentUser && user.uid === currentUser.uid
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
                                          currentUser &&
                                          user.uid === currentUser.uid
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
                className={cn(
                  "relative z-20 -m-2.5 block cursor-pointer p-2.5 md:hidden",
                  lightNavSurface ? "text-zinc-900" : "text-zinc-100",
                )}
              >
                <span className="relative block size-6">
                  <Menu
                    className={cn(
                      "absolute inset-0 m-auto size-6 transition-transform duration-300 ease-in-out",
                      menuState
                        ? "rotate-90 opacity-0 scale-0"
                        : "rotate-0 opacity-100 scale-100",
                    )}
                  />
                  <X
                    className={cn(
                      "absolute inset-0 m-auto size-6 transition-transform duration-300 ease-in-out",
                      menuState
                        ? "rotate-0 opacity-100 scale-100"
                        : "-rotate-90 opacity-0 scale-0",
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
                      "pr-8",
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
                          : "text-gray-400 hover:text-gray-200",
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
                            currentUser && user.uid === currentUser.uid
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
                                      currentUser &&
                                      user.uid === currentUser.uid
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
                      : "bg-gray-700 text-gray-200",
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
                    variant="outline"
                    size="sm"
                    onClick={() => handleAuthNavigate("/login")}
                    className={authNavOutlineClassName}
                  >
                    Login
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAuthNavigate("/signup")}
                    className={authNavOutlineClassName}
                  >
                    Sign Up
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Menu */}
            {createPortal(
              <AnimatePresence>
                {menuState && (
                  <motion.div
                    className="fixed inset-0 z-30 md:hidden"
                    initial="closed"
                    animate="open"
                    exit="closed"
                  >
                    <motion.button
                      type="button"
                      aria-label="Close menu"
                      className="absolute inset-0 h-full w-full bg-black/35 backdrop-blur-sm"
                      variants={backdropVariants}
                      onClick={closeMenu}
                    />
                    <motion.div
                      ref={drawerRef}
                      role="dialog"
                      aria-modal="true"
                      aria-label="Mobile navigation menu"
                      variants={drawerVariants}
                      className={cn(
                        "absolute right-0 top-0 flex h-[100dvh] w-[70vw] max-w-sm flex-col border-l p-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] shadow-2xl",
                        mobileDrawerSurfaceClassName,
                      )}
                      onClick={(event) => event.stopPropagation()}
                    >
                    <div className="mb-6 flex items-center justify-between gap-3">
                      <span className="text-sm font-medium uppercase tracking-[0.2em] text-current/60">
                        Menu
                      </span>
                      <button
                        type="button"
                        aria-label="Close menu"
                        className="rounded-full p-2 text-current/70 transition hover:bg-current/10 hover:text-current"
                        onClick={closeMenu}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="flex flex-col space-y-3">
                      {isLoading ? (
                        <Button
                          disabled
                          size="sm"
                          className={mobileDrawerLoadingClassName}
                        >
                          Loading...
                        </Button>
                      ) : isSignedIn ? (
                        <>
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className={cn("justify-start", mobileDrawerItemClassName)}
                            onClick={closeMenu}
                          >
                            <Link
                              to="/profile"
                              className="flex items-center gap-2"
                            >
                              <RxAvatar className="!w-5 !h-5" />
                              <span>Profile</span>
                            </Link>
                          </Button>
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className={cn("justify-start", mobileDrawerItemClassName)}
                            onClick={closeMenu}
                          >
                            <Link
                              to="/analytics"
                              className="flex items-center gap-2"
                            >
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
                                "justify-start",
                                mobileDrawerItemClassName,
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "w-full justify-start",
                              mobileDrawerItemClassName,
                            )}
                            onClick={closeMenu}
                          >
                            <ThemeSelector
                              onThemeChange={closeMenu}
                              className={cn(
                                "justify-start",
                                mobileDrawerOptionTextClassName,
                              )}
                              inheritColor
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSignOutAndClose}
                            className={cn(
                              "justify-start",
                              mobileDrawerItemClassName,
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <PiSignOutThin />
                              <span>Sign Out</span>
                            </div>
                          </Button>
                        </>
                      ) : (
                        <div className="flex flex-col items-stretch gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAuthNavigate("/login")}
                            className={cn(
                              mobileMenuAuthOutlineClassName,
                              "w-full justify-center",
                            )}
                          >
                            Login
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAuthNavigate("/signup")}
                            className={cn(
                              mobileMenuAuthOutlineClassName,
                              "w-full justify-center",
                            )}
                          >
                            Sign Up
                          </Button>
                        </div>
                      )}
                    </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>,
              document.body,
            )}
          </motion.div>
        </div>
      </nav>
    </header>
  );
};
