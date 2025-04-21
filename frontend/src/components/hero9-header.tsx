import { Link } from "react-router-dom";
import { Menu, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import React, { useEffect, useRef } from "react";
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
import {
  Input,
  VStack,
  Text,
  Avatar,
  Spinner,
  useToast,
  Flex,
} from "@chakra-ui/react";

const menuItems = [{ name: "Profile", href: "/Profile" }];

export const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [isSignedIn, setIsSignedIn] = React.useState(false);
  const [uid, setUid] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [entries, setEntries] = React.useState([]);
  const { scrollYProgress } = useScroll();
  const { colorMode, toggleColorMode } = useColorMode();
  const toast = useToast();

  // Search-related states
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const searchRef = useRef(null);

  // Function to close the mobile menu
  const closeMenu = () => setMenuState(false);

  // Modified handlers that combine existing functionality with menu closing
  const handleSignOutAndClose = async () => {
    await handleSignOut();
    closeMenu();
  };

  const handleGoogleSignInAndClose = async () => {
    await handleGoogleSignIn();
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
  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");
      const token = await user.getIdToken();
      const response = await fetch(
        `http://localhost:5001/api/searchUsers?query=${encodeURIComponent(
          query
        )}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) throw new Error("Failed to search users");
      const data = await response.json();
      setSearchResults(data.data || []);
    } catch (error) {
      console.error("Error searching users:", error);
      toast({
        title: "Error",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle click-away to clear search
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchQuery("");
        setSearchResults([]);
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsSignedIn(true);
        setUid(user.uid);
      } else {
        setIsSignedIn(false);
        setUid(null);
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
      if (!response.ok) throw new Error(await response.text());
      const userData = await response.json();
      console.log("User Data:", userData.uid);

      const userResponse = await fetch(
        "https://gym-tracker-brown.vercel.app/api/getCurrentUser",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!userResponse.ok) throw new Error(await userResponse.text());
      const resultOne = await userResponse.json();
      console.log("Logged in as:", resultOne);

      setIsSignedIn(true);
    } catch (error) {
      console.error("Error during sign-in:", error);
      handleSignOut();
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
              "relative flex flex-wrap items-center justify-between gap-4 py-3 duration-200 lg:gap-0 lg:py-6",
              scrolled && "lg:py-4"
            )}
          >
            {/* Logo, Search Icon, and Hamburger */}
            <div className="flex w-full items-center justify-between gap-4 lg:w-auto md:w-auto">
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

              <div className="flex items-center gap-4">
                {/* Mobile Search Icon/Input */}
                <div className="relative md:hidden" ref={searchRef}>
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
                    <div className="flex items-center gap-2">
                      <Input
                        borderRadius="16px"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          searchUsers(e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()} // Prevent click propagation
                        onTouchStart={(e) => e.stopPropagation()} // Prevent touch propagation
                        size="sm"
                        autoFocus
                        className={cn(
                          colorMode === "light"
                            ? "bg-gray-100 text-gray-700"
                            : "bg-gray-700 text-gray-200",
                          "w-[150px]" // Adjust width as needed
                        )}
                      />
                      {searchQuery && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSearchQuery("");
                            setSearchResults([]);
                            setIsSearchOpen(false); // Close search box
                          }}
                          className={cn(
                            colorMode === "light"
                              ? "text-gray-500 hover:text-gray-700"
                              : "text-gray-400 hover:text-gray-200"
                          )}
                          aria-label="Clear search"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      {isSearching && <Spinner size="sm" className="ml-2" />}
                    </div>
                  )}
                  {/* Search Results Dropdown */}
                  {(searchResults.length > 0 ||
                    (searchQuery &&
                      !isSearching &&
                      searchResults.length === 0)) && (
                    <VStack
                      align="start"
                      spacing={2}
                      w="full"
                      maxW="calc(100vw - 2rem)"
                      bg={colorMode === "light" ? "white" : "gray.800"}
                      p={4}
                      borderRadius="md"
                      boxShadow="md"
                      position="absolute"
                      top="100%"
                      left="0"
                      zIndex="10"
                    >
                      {searchResults.length > 0 ? (
                        searchResults.map((user) => (
                          <Link
                            key={user.uid}
                            to={
                              auth.currentUser &&
                              user.uid === auth.currentUser.uid
                                ? "/profile"
                                : `/user/${user.uid}`
                            }
                            onClick={() => {
                              closeMenu();
                              setSearchQuery("");
                              setSearchResults([]);
                              setIsSearchOpen(false);
                            }}
                            aria-label={`View ${user.name}'s profile`}
                          >
                            <Flex
                              align="center"
                              _hover={{ bg: "gray.100" }}
                              p={2}
                              w="full"
                            >
                              <Avatar src={user.picture} size="sm" mr={2} />
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
                            </Flex>
                          </Link>
                        ))
                      ) : (
                        <Text w="full">No users found</Text>
                      )}
                    </VStack>
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
            </div>

            {/* Desktop Buttons and Search */}
            <div className="hidden md:flex items-center gap-3">
              {/* Desktop Search Icon/Input */}
              <div className="relative" ref={searchRef}>
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
                  <Flex align="center">
                    <Input
                      borderRadius="16px"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        searchUsers(e.target.value);
                      }}
                      size="sm"
                      width="200px"
                      mr="15px"
                      autoFocus
                      className={cn(
                        colorMode === "light"
                          ? "bg-gray-100 text-gray-700"
                          : "bg-gray-700 text-gray-200"
                      )}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setIsSearchOpen(isSearchOpen ? false : isSearchOpen)
                      }
                      className={cn(
                        colorMode === "light"
                          ? "text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                          : "text-gray-500 hover:text-blue-300 hover:bg-gray-800"
                      )}
                      aria-label="Open search"
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
                          "absolute right-0 top-1/2 -translate-y-1/2",
                          colorMode === "light"
                            ? "text-gray-500 hover:text-gray-700"
                            : "text-gray-400 hover:text-gray-200"
                        )}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    {isSearching && (
                      <Spinner
                        size="sm"
                        position="absolute"
                        right="30px"
                        top="50%"
                        transform="translateY(-50%)"
                      />
                    )}
                    {searchResults.length > 0 && (
                      <VStack
                        align="start"
                        spacing={2}
                        w="200px"
                        bg={colorMode === "light" ? "white" : "gray.800"}
                        p={4}
                        borderRadius="md"
                        boxShadow="md"
                        position="absolute"
                        top="40px"
                        left="0"
                        zIndex="10"
                      >
                        {searchResults.map((user) => (
                          <Link
                            key={user.uid}
                            to={
                              auth.currentUser &&
                              user.uid === auth.currentUser.uid
                                ? "/profile"
                                : `/user/${user.uid}`
                            }
                            onClick={() => {
                              closeMenu();
                              setSearchQuery("");
                              setSearchResults([]);
                              setIsSearchOpen(false);
                            }}
                            aria-label={`View ${user.name}'s profile`}
                          >
                            <Flex
                              align="center"
                              _hover={{ bg: "gray.100" }}
                              p={2}
                              w="full"
                            >
                              <Avatar src={user.picture} size="sm" mr={2} />
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
                            </Flex>
                          </Link>
                        ))}
                      </VStack>
                    )}
                    {searchQuery &&
                      !isSearching &&
                      searchResults.length === 0 && (
                        <Text
                          position="absolute"
                          top="40px"
                          left="0"
                          bg={colorMode === "light" ? "white" : "gray.800"}
                          p={4}
                          borderRadius="md"
                          boxShadow="md"
                          w="200px"
                          zIndex="10"
                        >
                          No users found
                        </Text>
                      )}
                  </Flex>
                )}
              </div>

              {/* Desktop Buttons */}
              <div className="flex flex-row gap-3">
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
                          : "border-gray-800 bg-inherit text-gray-500 hover:text-blue-300 hover:bg-gray-800"
                      )}
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
                          : "border-gray-800 bg-inherit text-gray-400 hover:text-blue-300 hover:bg-zinc-800"
                      )}
                    >
                      <Link to="/create">
                        <PlusSquareIcon className="h-4 w-4" />
                        <span>Create</span>
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSignOut}
                      className={cn(
                        colorMode === "light"
                          ? "border-gray-200 text-gray-500 bg-inherit hover:bg-gray-200"
                          : "border-gray-800 text-gray-500 bg-slate-900 hover:bg-gray-500 hover:text-blue-300"
                      )}
                    >
                      <PiSignOutThin />
                      <span>Sign Out</span>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGoogleSignIn}
                      className={cn(
                        colorMode === "light"
                          ? "border-gray-300 text-gray-700 hover:bg-gray-100 bg-stone-100"
                          : "border-gray-600 text-gray-200 hover:bg-gray-700"
                      )}
                    >
                      Login
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGoogleSignIn}
                      className={cn(
                        colorMode === "light"
                          ? "border-gray-200 text-gray-500 bg-inherit hover:bg-gray-200 bg-stone-100"
                          : "border-gray-800 text-gray-200 hover:text-blue-400 hover:bg-gray-200"
                      )}
                    >
                      Sign Up
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  onClick={toggleColorMode}
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
              </div>
            </div>

            {/* Mobile Menu */}
            <motion.div
              variants={menuVariants}
              initial="closed"
              animate={menuState ? "open" : "closed"}
              className={cn(
                "w-full lg:hidden md:hidden",
                menuState
                  ? "block bg-background mb-6 rounded-xl border p-6 shadow-2xl shadow-zinc-400/20 mt-4"
                  : "hidden"
              )}
            >
              {/* Mobile Buttons */}
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
                          : "border-gray-800 bg-inherit text-gray-500 hover:text-blue-400 hover:bg-gray-200"
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
                          : "border-gray-800 bg-inherit text-gray-500 hover:text-blue-400 hover:bg-gray-200"
                      )}
                      onClick={closeMenu}
                    >
                      <Link to="/create" className="flex items-center gap-2">
                        <PlusSquareIcon className="h-4 w-4" />
                        <span>Create</span>
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSignOutAndClose}
                      className={cn(
                        colorMode === "light"
                          ? "border-gray-200 text-gray-500 bg-inherit hover:bg-gray-200"
                          : "border-gray-800 bg-inherit text-gray-500 hover:text-blue-400 hover:bg-gray-200"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <PiSignOutThin />
                        <span>Sign Out</span>
                      </div>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGoogleSignInAndClose}
                      className={cn(
                        colorMode === "light"
                          ? "border-gray-200 text-gray-500 bg-inherit hover:bg-gray-200"
                          : "border-gray-800 bg-inherit text-gray-500 hover:text-blue-400 hover:bg-gray-200"
                      )}
                    >
                      Login
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGoogleSignInAndClose}
                      className={cn(
                        colorMode === "light"
                          ? "border-gray-200 text-gray-500 bg-inherit hover:bg-gray-200"
                          : "border-gray-800 bg-inherit text-gray-500 hover:text-blue-400 hover:bg-gray-200"
                      )}
                    >
                      Sign Up
                    </Button>
                  </>
                )}
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
              </div>
            </motion.div>
          </motion.div>
        </div>
      </nav>
    </header>
  );
};
