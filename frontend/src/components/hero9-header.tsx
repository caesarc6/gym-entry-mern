import { Link } from "react-router-dom";
import { Logo } from "./logo";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import React from "react";
import { useScroll, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { auth, googleProvider } from "../firebase"; // Adjust path to your Firebase config
import { signInWithPopup, signOut } from "firebase/auth";
import { PlusSquareIcon } from "@chakra-ui/icons"; // For create post icon
import { IoMoon } from "react-icons/io5"; // Moon icon for dark mode
import { LuSun } from "react-icons/lu"; // Sun icon for light mode
import { useColorMode } from "@chakra-ui/react"; // Chakra UI color mode hook

const menuItems = [
  { name: "Profile", href: "/Profile" },
  { name: "Solution", href: "#link" },
  { name: "Pricing", href: "#link" },
  { name: "About", href: "#link" },
];

export const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [isSignedIn, setIsSignedIn] = React.useState(false);
  const [uid, setUid] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [entries, setEntries] = React.useState([]); // From second navbar
  const { scrollYProgress } = useScroll();
  const { colorMode, toggleColorMode } = useColorMode(); // Chakra UI color mode

  // Handle auth state changes (from both navbars)
  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsSignedIn(true);
        setUid(user.uid);
      } else {
        setIsSignedIn(false);
        setUid(null);
        setEntries([]); // Clear entries on sign-out (from second navbar)
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Handle scroll behavior
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

      // Verify token with backend (from first navbar)
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

      // Fetch current user data (from first navbar)
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

      setIsSignedIn(true); // Explicitly set signed-in state (from second navbar)
    } catch (error) {
      console.error("Error during sign-in:", error);
      handleSignOut(); // Clear state on error (from both navbars)
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setIsSignedIn(false);
      setUid(null);
      setEntries([]); // Clear entries on sign-out (from second navbar)
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <header>
      <nav className="fixed z-20 w-full">
        <div
          className={cn(
            "mx-auto max-w-7xl px-6 transition-all duration-300 lg:px-12 backdrop-blur-2xl border-b"
            // scrolled && "bg-background/10" // Slight background change on scroll
          )}
        >
          <motion.div
            className={cn(
              "relative flex flex-wrap items-center justify-between gap-6 py-3 duration-200 lg:gap-0 lg:py-6",
              scrolled && "lg:py-4"
            )}
          >
            {/* Logo and Hamburger */}
            <div className="flex w-full items-center justify-between gap-12 lg:w-auto">
              <a
                href="/"
                aria-label="home"
                className="flex items-center space-x-2"
              >
                {/* <Logo /> */}
                {/* Adding Ethereal Gains text from second navbar */}
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
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
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

              {/* Desktop Menu */}
              <div className="hidden lg:block">
                <ul className="flex gap-8 text-sm">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <a
                        href={item.href}
                        className="text-muted-foreground hover:text-accent-foreground duration-150"
                      >
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Mobile/Desktop Actions */}
            <div
              className={cn(
                "w-full lg:w-fit flex flex-wrap items-center justify-end space-y-8 md:flex-nowrap lg:gap-6 lg:space-y-0",
                menuState
                  ? "block bg-background mb-6 rounded-xl border p-6 shadow-2xl shadow-zinc-300/20 lg:m-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent mt-4 lg:mt-0"
                  : "hidden lg:flex" // Show on lg screens even when menuState is false
              )}
            >
              {/* Mobile Menu */}
              <ul className="space-y-6 text-base lg:hidden">
                {menuItems.map((item, index) => (
                  <li key={index}>
                    <a
                      href={item.href}
                      className="text-muted-foreground hover:text-accent-foreground duration-150"
                    >
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>

              {/* Buttons */}
              <div className="mt-6 flex w-full flex-row space-y-3 min:sm:flex-col sm:gap-3 sm:space-y-0 md:w-fit lg:mt-0 sm:place-self-center sm:w-[200px]">
                {isLoading ? (
                  <Button disabled size="sm">
                    Loading...
                  </Button>
                ) : isSignedIn ? (
                  <>
                    <Button asChild size="sm">
                      <Link to="/create">
                        <PlusSquareIcon className="mr-2 h-4 w-4" />
                        Create Post
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleSignOut}>
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGoogleSignIn}
                    >
                      Login
                    </Button>
                    <Button size="sm" onClick={handleGoogleSignIn}>
                      Sign Up
                    </Button>
                  </>
                )}
                {/* Color Mode Toggle */}
                <Button size="sm" onClick={toggleColorMode}>
                  {colorMode === "light" ? (
                    <IoMoon size={20} />
                  ) : (
                    <LuSun size={20} />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </nav>
    </header>
  );
};
// ==================================

// import { Link } from "react-router-dom";
// import { Logo } from "./logo";
// import { Menu, X } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import React from "react";
// import { useScroll, motion } from "framer-motion";
// import { cn } from "@/lib/utils";
// import { auth, googleProvider } from "../firebase"; // Adjust path to your Firebase config
// import { signInWithPopup, signOut } from "firebase/auth";
// import { PlusSquareIcon } from "@chakra-ui/icons"; // Keep this for the create post icon

// const menuItems = [
//   { name: "Profile", href: "/Profile" },
//   { name: "Solution", href: "#link" },
//   { name: "Pricing", href: "#link" },
//   { name: "About", href: "#link" },
// ];

// export const HeroHeader = () => {
//   const [menuState, setMenuState] = React.useState(false);
//   const [scrolled, setScrolled] = React.useState(false);
//   const [isSignedIn, setIsSignedIn] = React.useState(false);
//   const [uid, setUid] = React.useState(null);
//   const [isLoading, setIsLoading] = React.useState(true);
//   const { scrollYProgress } = useScroll();

//   // Handle auth state changes
//   React.useEffect(() => {
//     const unsubscribe = auth.onAuthStateChanged((user) => {
//       if (user) {
//         setIsSignedIn(true);
//         setUid(user.uid);
//       } else {
//         setIsSignedIn(false);
//         setUid(null);
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

//       // Verify token with your backend
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

//       // Fetch current user data
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
//     } catch (error) {
//       console.error("Error signing out:", error);
//     }
//   };

//   return (
//     <header>
//       <nav className="fixed z-20 w-full">
//         <div
//           className={cn(
//             "mx-auto max-w-7xl px-6 transition-all duration-300 lg:px-12 backdrop-blur-2xl border-b"
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
//                 <Logo />
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
//               <div className="hidden lg:block">
//                 <ul className="flex gap-8 text-sm">
//                   {menuItems.map((item, index) => (
//                     <li key={index}>
//                       <a
//                         href={item.href}
//                         className="text-muted-foreground hover:text-accent-foreground duration-150"
//                       >
//                         {item.name}
//                       </a>
//                     </li>
//                   ))}
//                 </ul>
//               </div>
//             </div>

//             {/* Mobile/Desktop Actions */}
//             <div
//               className={cn(
//                 "w-full lg:w-fit",
//                 menuState ? "block lg:flex" : "hidden",
//                 "bg-background mb-6 w-full flex-wrap items-center justify-end space-y-8 rounded-xl border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent mt-4 lg:mt-0"
//               )}
//             >
//               <ul className="space-y-6 text-base lg:hidden">
//                 {menuItems.map((item, index) => (
//                   <li key={index}>
//                     <a
//                       href={item.href}
//                       className="text-muted-foreground hover:text-accent-foreground duration-150"
//                     >
//                       {item.name}
//                     </a>
//                   </li>
//                 ))}
//               </ul>
//               <div className="mt-6 flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit lg:mt-0">
//                 {isLoading ? (
//                   <Button disabled size="sm">
//                     Loading...
//                   </Button>
//                 ) : isSignedIn ? (
//                   <>
//                     <Button asChild size="sm">
//                       <Link to="/create">
//                         <PlusSquareIcon className="mr-2 h-4 w-4" />
//                         Create Post
//                       </Link>
//                     </Button>
//                     <Button variant="outline" size="sm" onClick={handleSignOut}>
//                       Sign Out
//                     </Button>
//                   </>
//                 ) : (
//                   <>
//                     <Button
//                       variant="outline"
//                       size="sm"
//                       onClick={handleGoogleSignIn}
//                     >
//                       Login
//                     </Button>
//                     <Button size="sm" onClick={handleGoogleSignIn}>
//                       Sign Up
//                     </Button>
//                   </>
//                 )}
//               </div>
//             </div>
//           </motion.div>
//         </div>
//       </nav>
//     </header>
//   );
// };

// -------------------------------------------

// import { Link } from "react-router-dom";
// import { Logo } from "./logo";
// import { Menu, X } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import React from "react";
// import { useScroll, motion } from "framer-motion"; // Updated to "framer-motion"
// import { cn } from "@/lib/utils";

// const menuItems = [
//   { name: "Profile", href: "/Profile" },
//   { name: "Solution", href: "#link" },
//   { name: "Pricing", href: "#link" },
//   { name: "About", href: "#link" },
// ];

// export const HeroHeader = () => {
//   const [menuState, setMenuState] = React.useState(false);
//   const [scrolled, setScrolled] = React.useState(false);
//   const { scrollYProgress } = useScroll();

//   React.useEffect(() => {
//     const unsubscribe = scrollYProgress.on("change", (latest) => {
//       setScrolled(latest > 0.05); // Still tracking scroll for padding adjustments
//     });
//     return () => unsubscribe();
//   }, [scrollYProgress]);

//   return (
//     <header>
//       <nav className="fixed z-20 w-full">
//         <div
//           className={cn(
//             "mx-auto max-w-7xl px-6 transition-all duration-300 lg:px-12 backdrop-blur-2xl border-b"
//             // Removed: scrolled && "bg-background/50 backdrop-blur-2xl"
//           )}
//         >
//           <motion.div
//             className={cn(
//               "relative flex flex-wrap items-center justify-between gap-6 py-3 duration-200 lg:gap-0 lg:py-6",
//               scrolled && "lg:py-4" // Keep padding adjustment on scroll
//             )}
//           >
//             {/* Logo and Hamburger */}
//             <div className="flex w-full items-center justify-between gap-12 lg:w-auto">
//               <a
//                 href="/"
//                 aria-label="home"
//                 className="flex items-center space-x-2"
//               >
//                 <Logo />
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
//               <div className="hidden lg:block">
//                 <ul className="flex gap-8 text-sm">
//                   {menuItems.map((item, index) => (
//                     <li key={index}>
//                       <a
//                         href={item.href}
//                         className="text-muted-foreground hover:text-accent-foreground duration-150"
//                       >
//                         {item.name}
//                       </a>
//                     </li>
//                   ))}
//                 </ul>
//               </div>
//             </div>

//             {/* Mobile Menu */}
//             <div
//               className={cn(
//                 "w-full lg:w-fit",
//                 menuState ? "block lg:flex" : "hidden",
//                 "bg-background mb-6 w-full flex-wrap items-center justify-end space-y-8 rounded-xl border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent mt-4 lg:mt-0"
//               )}
//             >
//               <ul className="space-y-6 text-base lg:hidden">
//                 {menuItems.map((item, index) => (
//                   <li key={index}>
//                     <a
//                       href={item.href}
//                       className="text-muted-foreground hover:text-accent-foreground duration-150"
//                     >
//                       {item.name}
//                     </a>
//                   </li>
//                 ))}
//               </ul>
//               <div className="mt-6 flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit lg:mt-0">
//                 <Button asChild variant="outline" size="sm">
//                   <a href="#">Login</a>
//                 </Button>
//                 <Button asChild size="sm">
//                   <a href="#">Sign Up</a>
//                 </Button>
//               </div>
//             </div>
//           </motion.div>
//         </div>
//       </nav>
//     </header>
//   );
// };
