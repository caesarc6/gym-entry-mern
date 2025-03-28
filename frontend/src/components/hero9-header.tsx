import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import React from "react";
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
              "relative flex flex-wrap items-center justify-between gap-6 py-3 duration-200 lg:gap-0 lg:py-6",
              scrolled && "lg:py-4"
            )}
          >
            {/* Logo and Hamburger */}
            <div className="flex w-full items-center justify-between gap-12 lg:w-auto md:w-auto">
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

              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState ? "Close Menu" : "Open Menu"}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 md:hidden"
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

            {/* Desktop Buttons (always visible on lg screens) */}
            <div className="hidden md:flex items-center gap-6">
              {/* Buttons */}
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
                      {/* <Link to="/profile">
                        <RxAvatar className="!w-5 !h-5" />
                      </Link> */}
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
                          : "border-gray-800  text-gray-200 hover:text-blue-400 hover:bg-gray-200"
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

            {/* Mobile Menu (only visible when menuState is true) */}
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
              {/* Mobile Menu Items */}
              {/* <ul className="space-y-6 text-base">
                {menuItems.map((item, index) => (
                  <li key={index}>
                    <a
                      href={item.href}
                      className={cn(
                        "duration-150",
                        colorMode === "light"
                          ? "text-gray-600 hover:text-blue-500"
                          : "text-gray-300 hover:text-blue-300"
                      )}
                    >
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul> */}

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
                      onClick={closeMenu} // Add click handler to close menu
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
                      onClick={closeMenu} // Add click handler to close menu
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
                        // ? "border-gray-300 text-gray-700 hover:bg-gray-100"
                        // : "border-gray-600 text-gray-200 hover:bg-gray-700"
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
                        // ? "bg-blue-500 text-white hover:bg-blue-600"
                        // : "bg-blue-700 text-white hover:bg-blue-800"
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

// ----------------------------------

// import { Link } from "react-router-dom";
// import { Menu, X } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import React from "react";
// import { useScroll, motion } from "framer-motion";
// import { cn } from "@/lib/utils";
// import { auth, googleProvider } from "../firebase"; // Adjust path to your Firebase config
// import { signInWithPopup, signOut } from "firebase/auth";
// import { PlusSquareIcon } from "@chakra-ui/icons"; // For create post icon
// import { IoMoon } from "react-icons/io5"; // Moon icon for dark mode
// import { LuSun } from "react-icons/lu"; // Sun icon for light mode
// import { useColorMode } from "@chakra-ui/react"; // Chakra UI color mode hook
// import { RxAvatar } from "react-icons/rx";
// import { PiSignOutThin } from "react-icons/pi";

// const menuItems = [
//   { name: "Profile", href: "/Profile" },
//   // { name: "Solution", href: "#link" },
//   // { name: "Pricing", href: "#link" },
//   // { name: "About", href: "#link" },
// ];

// export const HeroHeader = () => {
//   const [menuState, setMenuState] = React.useState(false);
//   const [scrolled, setScrolled] = React.useState(false);
//   const [isSignedIn, setIsSignedIn] = React.useState(false);
//   const [uid, setUid] = React.useState(null);
//   const [isLoading, setIsLoading] = React.useState(true);
//   const [entries, setEntries] = React.useState([]); // From second navbar
//   const { scrollYProgress } = useScroll();
//   const { colorMode, toggleColorMode } = useColorMode(); // Chakra UI color mode

//   // Handle auth state changes
//   React.useEffect(() => {
//     const unsubscribe = auth.onAuthStateChanged((user) => {
//       if (user) {
//         setIsSignedIn(true);
//         setUid(user.uid);
//       } else {
//         setIsSignedIn(false);
//         setUid(null);
//         setEntries([]); // Clear entries on sign-out
//       }
//       setIsLoading(false);
//     });
//     return () => unsubscribe();
//   }, []);

//   // Handle scroll behavior
//   React.useEffect(() => {
//     const unsubscribe = scrollYProgress.on("change", (latest) => {
//       setScrolled(latest > 0.05);
//     });
//     return () => unsubscribe();
//   }, [scrollYProgress]);

//   const handleGoogleSignIn = async () => {
//     try {
//       const result = await signInWithPopup(auth, googleProvider);
//       const token = await result.user.getIdToken();

//       const response = await fetch(
//         "https://gym-tracker-brown.vercel.app/api/protected",
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${token}`,
//           },
//         }
//       );
//       if (!response.ok) throw new Error(await response.text());
//       const userData = await response.json();
//       console.log("User Data:", userData.uid);

//       const userResponse = await fetch(
//         "https://gym-tracker-brown.vercel.app/api/getCurrentUser",
//         {
//           method: "GET",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${token}`,
//           },
//         }
//       );
//       if (!userResponse.ok) throw new Error(await userResponse.text());
//       const resultOne = await userResponse.json();
//       console.log("Logged in as:", resultOne);

//       setIsSignedIn(true);
//     } catch (error) {
//       console.error("Error during sign-in:", error);
//       handleSignOut();
//     }
//   };

//   const handleSignOut = async () => {
//     try {
//       await signOut(auth);
//       setIsSignedIn(false);
//       setUid(null);
//       setEntries([]);
//     } catch (error) {
//       console.error("Error signing out:", error);
//     }
//   };

//   return (
//     <header>
//       <nav className="fixed z-20 w-full">
//         <div
//           className={cn(
//             "mx-auto max-w-7xl px-6 transition-all duration-300 lg:px-12 backdrop-blur-2xl border-b",
//             colorMode === "dark" ? "bg-gray-900/80" : "bg-background/80"
//           )}
//         >
//           <motion.div
//             className={cn(
//               "relative flex flex-wrap items-center justify-between gap-6 py-3 duration-200 lg:gap-0 lg:py-6",
//               scrolled && "lg:py-4"
//             )}
//           >
//             {/* Logo and Hamburger */}
//             <div className="flex w-full items-center justify-between gap-12 lg:w-auto">
//               <a
//                 href="/"
//                 aria-label="home"
//                 className="flex items-center space-x-2"
//               >
//                 <span
//                   className={cn(
//                     "text-xl md:text-2xl uppercase bg-gradient-to-r from-blue-300 to-gray-400 bg-clip-text text-transparent"
//                   )}
//                 >
//                   Ethereal Gains
//                 </span>
//               </a>

//               <button
//                 onClick={() => setMenuState(!menuState)}
//                 aria-label={menuState ? "Close Menu" : "Open Menu"}
//                 className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
//               >
//                 <span className="relative block size-6">
//                   <Menu
//                     className={cn(
//                       "absolute inset-0 m-auto size-6 transition-transform duration-300 ease-in-out",
//                       menuState
//                         ? "rotate-90 opacity-0 scale-0"
//                         : "rotate-0 opacity-100 scale-100"
//                     )}
//                   />
//                   <X
//                     className={cn(
//                       "absolute inset-0 m-auto size-6 transition-transform duration-300 ease-in-out",
//                       menuState
//                         ? "rotate-0 opacity-100 scale-100"
//                         : "-rotate-90 opacity-0 scale-0"
//                     )}
//                   />
//                 </span>
//               </button>

//               {/* Desktop Menu */}

//               {/* <div className="hidden lg:block">
//                 <ul className="flex gap-8 text-sm">
//                   {menuItems.map((item, index) => (
//                     <li key={index}>
//                       <a
//                         href={item.href}
//                         className={cn(
//                           "duration-150",
//                           colorMode === "light"
//                             ? "text-gray-500 hover:text-blue-200"
//                             : "text-gray-500 hover:text-blue-300"
//                         )}
//                       >
//                         {item.name}
//                       </a>
//                     </li>
//                   ))}
//                 </ul>
//               </div> */}
//             </div>

//             {/* Mobile/Desktop Actions */}
//             <div
//               className={cn(
//                 "w-full lg:w-fit flex flex-wrap items-center justify-end space-y-8 md:flex-nowrap lg:gap-6 lg:space-y-0",
//                 menuState
//                   ? "block bg-background mb-6 rounded-xl border p-6 shadow-2xl shadow-zinc-400/20 lg:m-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent mt-4 lg:mt-0"
//                   : "hidden lg:flex"
//               )}
//             >
//               {/* Mobile Menu */}
//               <ul className="space-y-6 text-base lg:hidden">
//                 {menuItems.map((item, index) => (
//                   <li key={index}>
//                     <a
//                       href={item.href}
//                       className={cn(
//                         "duration-150",
//                         colorMode === "light"
//                           ? "text-gray-600 hover:text-blue-500"
//                           : "text-gray-300 hover:text-blue-300"
//                       )}
//                     >
//                       {item.name}
//                     </a>
//                   </li>
//                 ))}
//               </ul>

//               {/* Buttons */}
//               <div className="mt-6 flex w-full flex-row space-y-3 min:sm:flex-col sm:gap-3 sm:space-y-0 md:w-fit lg:mt-0 sm:place-self-center sm:w-[200px]">
//                 {isLoading ? (
//                   <Button
//                     disabled
//                     size="sm"
//                     className={cn(
//                       colorMode === "light"
//                         ? "bg-gray-200 text-gray-700"
//                         : "bg-gray-700 text-gray-200"
//                     )}
//                   >
//                     Loading...
//                   </Button>
//                 ) : isSignedIn ? (
//                   <>
//                     <Button
//                       asChild
//                       variant="ghost"
//                       size="sm"
//                       className={cn(
//                         colorMode === "light"
//                           ? " text-gray-400 hover:text-gray-500 hover:bg-gray-100 "
//                           : "border-gray-800 bg-inherit text-gray-500 hover:text-blue-300 hover:bg-gray-800"
//                       )}
//                     >
//                       <Link to="/profile">
//                         <RxAvatar className="!w-5 !h-5" />
//                       </Link>
//                     </Button>

//                     <Button
//                       asChild
//                       variant="ghost"
//                       size="sm"
//                       className={cn(
//                         colorMode === "light"
//                           ? " text-gray-400 hover:text-gray-500 hover:bg-gray-100 "
//                           : "border-gray-800 bg-inherit text-gray-400 hover:text-blue-300 hover:bg-zinc-800"
//                       )}
//                     >
//                       <Link to="/create">
//                         <PlusSquareIcon className=" h-4 w-4" />
//                       </Link>
//                     </Button>
//                     <Button
//                       variant="ghost"
//                       size="sm"
//                       onClick={handleSignOut}
//                       className={cn(
//                         colorMode === "light"
//                           ? "border-gray-200 text-gray-500 bg-inherit hover:bg-gray-200 "
//                           : "border-gray-800 text-gray-500 bg-slate-900  hover:bg-gray-500 hover:text-blue-300"
//                       )}
//                     >
//                       <PiSignOutThin />
//                     </Button>
//                   </>
//                 ) : (
//                   <>
//                     <Button
//                       variant="outline"
//                       size="sm"
//                       onClick={handleGoogleSignIn}
//                       className={cn(
//                         colorMode === "light"
//                           ? "border-gray-300 text-gray-700 hover:bg-gray-100"
//                           : "border-gray-600 text-gray-200 hover:bg-gray-700"
//                       )}
//                     >
//                       Login
//                     </Button>
//                     <Button
//                       size="sm"
//                       onClick={handleGoogleSignIn}
//                       className={cn(
//                         colorMode === "light"
//                           ? "bg-blue-500 text-white hover:bg-blue-600"
//                           : "bg-blue-700 text-white hover:bg-blue-800"
//                       )}
//                     >
//                       Sign Up
//                     </Button>
//                   </>
//                 )}
//                 {/* Color Mode Toggle */}
//                 <Button
//                   size="sm"
//                   onClick={toggleColorMode}
//                   className={cn(
//                     colorMode === "light"
//                       ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
//                       : "bg-gray-700 text-gray-200 hover:bg-gray-600"
//                   )}
//                 >
//                   {colorMode === "light" ? (
//                     <IoMoon size={20} />
//                   ) : (
//                     <LuSun size={20} />
//                   )}
//                 </Button>
//               </div>
//             </div>
//           </motion.div>
//         </div>
//       </nav>
//     </header>
//   );
// };
