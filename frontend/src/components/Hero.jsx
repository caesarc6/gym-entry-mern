import React, { useEffect, useState } from "react";
import { Container, SimpleGrid, Text, VStack, Button } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { useProductStore } from "../store/product";
import ProductCard from "../components/ProductCard";
import ProfilePage from "../pages/ProfilePage";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup } from "firebase/auth";
import { useColorModeValue } from "@chakra-ui/react";
import { motion } from "framer-motion";

export const Hero = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [blobSize, setBlobSize] = useState({ width: "25rem", height: "44rem" });
  const [largeBlobSize, setLargeBlobSize] = useState({
    width: "90rem",
    height: "50rem",
  });

  const updateBlobSize = () => {
    const screenWidth = window.innerWidth;
    if (screenWidth < 640) {
      setBlobSize({ width: "25vw", height: "35vh" });
      setLargeBlobSize({ width: "99vw", height: "52vh" });
    } else if (screenWidth < 1024) {
      setBlobSize({ width: "20vw", height: "35vh" });
      setLargeBlobSize({ width: "60vw", height: "40vh" });
    } else {
      setBlobSize({ width: "25rem", height: "32rem" });
      setLargeBlobSize({ width: "90rem", height: "50rem" });
    }
  };

  useEffect(() => {
    updateBlobSize(); // Set initial size
    window.addEventListener("resize", updateBlobSize); // Update on resize
    return () => window.removeEventListener("resize", updateBlobSize); // Cleanup
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log("User signed in:", result.user);
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

      const tokenForCurrentUser = await auth.currentUser.getIdToken();
      const currentUserResponse = await fetch(
        "https://gym-tracker-brown.vercel.app/api/getCurrentUser",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenForCurrentUser}`,
          },
        }
      );

      if (!currentUserResponse.ok) {
        throw new Error(await currentUserResponse.text());
      }

      const currentUserData = await currentUserResponse.json();
      console.log("Logged in as:", currentUserData);

      setIsSignedIn(true);
    } catch (error) {
      console.error("Error during sign-in:", error);
      handleSignOutUser();
    }
  };

  const handleSignOutUser = () => {
    setIsSignedIn(false);
  };

  const textMode = useColorModeValue("#8aa2b7", "#f9fafb");

  return (
    <>
      {/* Gradients */}
      <div aria-hidden="true" className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[#051a2b] overflow-hidden">
          <motion.div
            className="absolute bg-gradient-to-r from-background/50 to-background blur-3xl bg-slate-700"
            style={{
              top: "-10%",
              left: "50%",
              rotate: -60,
              x: "-5rem",
              width: blobSize.width,
              height: blobSize.height,
            }}
            animate={{
              y: [0, 20, -10, 0],
              scale: [1, 1.2, 0.9, 1],
              borderRadius: ["50%", "30% 70%", "60% 40%", "50%"],
              rotate: [-60, -55, -65, -60],
            }}
            transition={{
              type: "spring",
              stiffness: 50,
              damping: 10,
              mass: 1.5,
              repeat: Infinity,
              duration: 6,
            }}
          />
          <motion.div
            className="absolute bg-gradient-to-tl from-primary-foreground via-primary-foreground to-background blur-3xl rounded-full bg-[#cfe6ff]"
            style={{
              top: "-20%",
              left: "50%",
              rotate: -12,
              x: "-7rem",
              width: largeBlobSize.width,
              height: largeBlobSize.height,
            }}
            animate={{
              y: [0, 30, -15, 0],
              scale: [1, 1.15, 0.85, 1],
              borderRadius: ["50%", "40% 60%", "70% 30%", "50%"],
              rotate: [-12, -10, -14, -12],
            }}
            transition={{
              type: "spring",
              stiffness: 40,
              damping: 8,
              mass: 2,
              repeat: Infinity,
              duration: 8,
            }}
          />
          <motion.div
            className="absolute bg-gradient-to-r from-background/50 to-background blur-3xl bg-slate-700"
            style={{
              bottom: "-30%",
              left: "20%",
              rotate: 60,
              x: "5rem",
              width: blobSize.width,
              height: blobSize.height,
            }}
            animate={{
              y: [0, -20, 10, 0],
              scale: [1, 0.9, 1.1, 1],
              borderRadius: ["50%", "60% 40%", "30% 70%", "50%"],
              rotate: [60, 62, 58, 60],
            }}
            transition={{
              type: "spring",
              stiffness: 60,
              damping: 12,
              mass: 1.2,
              repeat: Infinity,
              duration: 7,
            }}
          />
          <motion.div
            className="absolute bg-gradient-to-tl from-primary-foreground via-primary-foreground to-background blur-3xl rounded-full bg-[#cfe6ff]"
            style={{
              bottom: "-36%",
              right: "54%",
              rotate: 12,
              x: "7rem",
              width: largeBlobSize.width,
              height: largeBlobSize.height,
            }}
            animate={{
              y: [0, -25, 15, 0],
              scale: [1, 1.25, 0.95, 1],
              borderRadius: ["50%", "70% 30%", "40% 60%", "50%"],
              rotate: [12, 14, 10, 12],
            }}
            transition={{
              type: "spring",
              stiffness: 45,
              damping: 9,
              mass: 1.8,
              repeat: Infinity,
              duration: 9,
            }}
          />
        </div>
      </div>
      {/* <div aria-hidden="true" className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[#061f32] overflow-hidden">
          <div
            className="absolute w-[25rem] h-[44rem] bg-gradient-to-r from-background/50 to-background blur-3xl rotate-[-60deg] transform -translate-x-[10rem] bg-slate-700 animate-blob"
            style={{ top: "-10%", left: "50%" }}
          />
          <div
            className="absolute w-[90rem] h-[50rem] bg-gradient-to-tl from-primary-foreground via-primary-foreground to-background blur-3xl rounded-full origin-top-left -rotate-12 -translate-x-[15rem] bg-[#cfe6ff] animate-blob-reverse"
            style={{ top: "-20%", left: "50%" }}
          />
          <div
            className="absolute w-[25rem] h-[44rem] bg-gradient-to-r from-background/50 to-background blur-3xl rotate-[60deg] transform translate-x-[10rem] bg-slate-700 animate-blob"
            style={{ bottom: "-30%", left: "20%" }}
          />
          <div
            className="absolute w-[90rem] h-[50rem] bg-gradient-to-tl from-primary-foreground via-primary-foreground to-background blur-3xl rounded-full origin-bottom-left rotate-12 translate-x-[15rem] bg-[#cfe6ff] animate-blob-reverse"
            style={{ bottom: "-36%", right: "54%" }}
          />
        </div>
      </div> */}
      {/* End Gradients */}

      {/* Hero */}
      <div className="relative top-36  h-[70vh] sm:h-[60vh] sm:top-48 lg:h-[50vh] content-center">
        <div className="relative justify-items-center">
          <div className="container py-10 lg:py-16">
            <div className="max-w-2xl text-center mx-auto">
              <p>All your workouts. In one place.</p>
              {/* Title */}
              <div className="mt-5 max-w-2xl">
                <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                  Track Your Progress Simply.
                </h1>
              </div>
              {/* End Title */}
              <div className="mt-5 max-w-3xl">
                <p className="text-xl text-muted-foreground">
                  Keep track of your workouts and progress with ease. Sign up
                  now to get started.
                </p>
              </div>
              {/* Buttons */}
              <div className="mt-8 gap-3 flex justify-center">
                <Button
                  size={"lg"}
                  onClick={handleGoogleSignIn}
                  className="p-3 rounded-md"
                >
                  <Text as="span" color="neutral.400">
                    Sign Up
                  </Text>
                </Button>
                <Button
                  size={"lg"}
                  variant={"outline"}
                  onClick={handleGoogleSignIn}
                  className="p-3 rounded-md"
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
  );
};
// --------------------------------------------
// import React, { useEffect, useState } from "react";
// import { Container, SimpleGrid, Text, VStack, Button } from "@chakra-ui/react";
// import { Link } from "react-router-dom";
// import { useProductStore } from "../store/product";
// import ProductCard from "../components/ProductCard";
// import ProfilePage from "../pages/ProfilePage";
// import { auth, googleProvider } from "../firebase";
// import { signInWithPopup } from "firebase/auth"; // Use signInWithPopup
// import { useColorModeValue } from "@chakra-ui/react";

// export const Hero = () => {
//   const [isSignedIn, setIsSignedIn] = useState(false);

//   const handleGoogleSignIn = async () => {
//     try {
//       // Sign in with Google using a popup
//       const result = await signInWithPopup(auth, googleProvider);
//       console.log("User signed in:", result.user);

//       // Get the ID token
//       const token = await result.user.getIdToken();

//       // Call your protected API endpoint
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

//       if (!response.ok) {
//         throw new Error(await response.text());
//       }

//       const userData = await response.json();
//       console.log("User Data:", userData.uid);

//       // Fetch current user data
//       const tokenForCurrentUser = await auth.currentUser.getIdToken();
//       const currentUserResponse = await fetch(
//         "https://gym-tracker-brown.vercel.app/api/getCurrentUser",
//         {
//           method: "GET",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${tokenForCurrentUser}`,
//           },
//         }
//       );

//       if (!currentUserResponse.ok) {
//         throw new Error(await currentUserResponse.text());
//       }

//       const currentUserData = await currentUserResponse.json();
//       console.log("Logged in as:", currentUserData);

//       setIsSignedIn(true); // Update sign-in state
//     } catch (error) {
//       console.error("Error during sign-in:", error);
//       handleSignOutUser();
//     }
//   };

//   const handleSignOutUser = () => {
//     // Clear feed and user sign-in state to sign out
//     setIsSignedIn(false);
//   };

//   const textMode = useColorModeValue("#8aa2b7", "#f9fafb");

//   return (
//     <>
//       {/* Gradients */}
//       <div
//         aria-hidden="true"
//         className="fixed inset-0 z-0" // Covers the entire viewport and stays fixed
//       >
//         <div className="absolute inset-0 bg-[#061f32] overflow-hidden">
//           {/* Top Gradients */}
//           {/* First Gradient (Top) */}
//           <div
//             className="absolute w-[25rem] h-[44rem] bg-gradient-to-r from-background/50 to-background blur-3xl rotate-[-60deg] transform -translate-x-[10rem] bg-slate-700 animate-blob"
//             style={{ top: "-10%", left: "50%" }} // Adjust positioning as needed
//           />
//           {/* Second Gradient (Top) */}
//           <div
//             className="absolute w-[90rem] h-[50rem] bg-gradient-to-tl from-primary-foreground via-primary-foreground to-background blur-3xl rounded-full origin-top-left -rotate-12 -translate-x-[15rem] bg-[#cfe6ff] animate-blob-reverse"
//             style={{ top: "-20%", left: "50%" }} // Adjust positioning as needed
//           />

//           {/* First Gradient (Bottom) */}
//           <div
//             className="absolute w-[25rem] h-[44rem] bg-gradient-to-r from-background/50 to-background blur-3xl rotate-[60deg] transform translate-x-[10rem] bg-slate-700 animate-blob"
//             style={{ bottom: "-30%", left: "20%" }} // Adjust positioning as needed
//           />
//           {/* Second Gradient (Bottom) */}
//           <div
//             className="absolute w-[90rem] h-[50rem] bg-gradient-to-tl from-primary-foreground via-primary-foreground to-background blur-3xl rounded-full origin-bottom-left rotate-12 translate-x-[15rem] bg-[#cfe6ff] animate-blob-reverse"
//             style={{ bottom: "-36%", right: "54%" }} // Adjust positioning as needed
//           />
//         </div>
//       </div>
//       {/* End Gradients */}

//       {/* Hero */}
//       <div className="relative overflow-hidden h-[100vh] sm:h-[100vh] lg:h-[100vh] content-center">
//         <div className="relative justify-items-center">
//           <div className="container py-10 lg:py-16">
//             <div className="max-w-2xl text-center mx-auto">
//               <p>All your workouts. In one place.</p>
//               {/* Title */}
//               <div className="mt-5 max-w-2xl">
//                 <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
//                   Track Your Progress Simply.
//                 </h1>
//               </div>
//               {/* End Title */}
//               <div className="mt-5 max-w-3xl">
//                 <p className="text-xl text-muted-foreground">
//                   Keep track of your workouts and progress with ease. Sign up
//                   now to get started.
//                 </p>
//               </div>
//               {/* Buttons */}
//               <div className="mt-8 gap-3 flex justify-center">
//                 <Button
//                   size={"lg"}
//                   onClick={handleGoogleSignIn} // Use the new handleGoogleSignIn function
//                   className="p-3 rounded-md"
//                 >
//                   <Text as="span" color="neutral.400">
//                     Sign Up
//                   </Text>
//                 </Button>
//                 <Button
//                   size={"lg"}
//                   variant={"outline"}
//                   onClick={handleGoogleSignIn} // Use the new handleGoogleSignIn function
//                   className="p-3 rounded-md"
//                 >
//                   Login
//                 </Button>
//               </div>
//               {/* End Buttons */}
//             </div>
//           </div>
//         </div>
//       </div>
//       {/* End Hero */}

//       <div className="relative justify-items-center pt-35 pb-5">
//         <p className="text-center text-[7px] tracking-tight lg:text-[10px] text-gray-400">
//           version 0.1
//         </p>
//       </div>
//     </>
//   );
// };

// --------------------------------------------

// import React from "react";
// import { Container, SimpleGrid, Text, VStack, Button } from "@chakra-ui/react";
// import { useEffect, useState } from "react";
// import { Link } from "react-router-dom";
// import { useProductStore } from "../store/product";
// import ProductCard from "../components/ProductCard";
// import ProfilePage from "../pages/ProfilePage";
// import { auth, googleProvider } from "../firebase";
// import { signInWithPopup } from "firebase/auth";
// import { useColorModeValue } from "@chakra-ui/react";

// export const Hero = () => {
//   const [isSignedIn, setIsSignedIn] = useState(false);

//   const handleGoogleSignIn = async () => {
//     try {
//       const result = await signInWithPopup(auth, googleProvider);
//       console.log(result);
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
//       if (!response.ok) {
//         throw new Error(await response.text());
//       }
//       const userData = await response.json();
//       console.log("User Data:", userData.uid);
//       // console.log("User Data:", userData);
//       try {
//         const token = await auth.currentUser.getIdToken();
//         const response = await fetch(
//           "https://gym-tracker-brown.vercel.app/api/getCurrentUser",
//           {
//             method: "GET",
//             headers: {
//               "Content-Type": "application/json",
//               Authorization: `Bearer ${token}`,
//             },
//           }
//         );
//         if (!response.ok) {
//           throw new Error(await response.text());
//         }
//         const resultOne = await response.json();
//         console.log("Logged in as:", resultOne);
//       } catch (error) {
//         console.error("Error fetching all UID:", error);
//       }
//     } catch (error) {
//       // clear feed and user sign in state to sign out
//       console.error("Error during sign-in:", error);
//       handleSignOutUser();
//     }
//   };

//   const textMode = useColorModeValue("#8aa2b7", "#f9fafb");

//   return (
//     <>
//       {/* Gradients */}
//       <div
//         aria-hidden="true"
//         className="fixed inset-0 z-0" // Covers the entire viewport and stays fixed
//       >
//         <div className="absolute inset-0 bg-[#061f32] overflow-hidden">
//           {/* Top Gradients */}
//           {/* First Gradient (Top) */}
//           <div
//             className="absolute w-[25rem] h-[44rem] bg-gradient-to-r from-background/50 to-background blur-3xl rotate-[-60deg] transform -translate-x-[10rem] bg-slate-700 animate-blob"
//             style={{ top: "-10%", left: "50%" }} // Adjust positioning as needed
//           />
//           {/* Second Gradient (Top) */}
//           <div
//             className="absolute w-[90rem] h-[50rem] bg-gradient-to-tl from-primary-foreground via-primary-foreground to-background blur-3xl rounded-full origin-top-left -rotate-12 -translate-x-[15rem] bg-[#cfe6ff] animate-blob-reverse"
//             style={{ top: "-20%", left: "50%" }} // Adjust positioning as needed
//           />

//           {/* First Gradient (Bottom) */}
//           <div
//             className="absolute w-[25rem] h-[44rem] bg-gradient-to-r from-background/50 to-background blur-3xl rotate-[60deg] transform translate-x-[10rem] bg-slate-700 animate-blob"
//             style={{ bottom: "-30%", left: "20%" }} // Adjust positioning as needed
//           />
//           {/* Second Gradient (Bottom) */}
//           <div
//             className="absolute w-[90rem] h-[50rem] bg-gradient-to-tl from-primary-foreground via-primary-foreground to-background blur-3xl rounded-full origin-bottom-left rotate-12 translate-x-[15rem] bg-[#cfe6ff] animate-blob-reverse"
//             style={{ bottom: "-36%", right: "54%" }} // Adjust positioning as needed
//           />
//         </div>
//       </div>
//       {/* End Gradients */}

//       {/* Hero */}
//       <div className="relative overflow-hidden h-[100vh] sm:h-[100vh] lg:h-[100vh] content-center">
//         <div className="relative justify-items-center">
//           <div className="container py-10 lg:py-16">
//             <div className="max-w-2xl text-center mx-auto">
//               <p>All your workouts. In one place.</p>
//               {/* Title */}
//               <div className="mt-5 max-w-2xl">
//                 <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
//                   Track Your Progress Simply.
//                 </h1>
//               </div>
//               {/* End Title */}
//               <div className="mt-5 max-w-3xl">
//                 <p className="text-xl text-muted-foreground">
//                   Keep track of your workouts and progress with ease. Sign up
//                   now to get started.
//                 </p>
//               </div>
//               {/* Buttons */}
//               <div className="mt-8 gap-3 flex justify-center">
//                 {/* <Button size={"lg"}>
//                       {" "}
//                       <Link to={"/signup"}>
//                         <Text as="span" color="neutral.400">
//                           Sign Up
//                         </Text>

//                       </Link>
//                     </Button> */}
//                 <Button
//                   size={"lg"}
//                   // variant={"outline"}
//                   onClick={async () => {
//                     await handleGoogleSignIn();
//                     setIsSignedIn(true);
//                   }}
//                   className="p-3  rounded-md"
//                 >
//                   <Text as="span" color="neutral.400">
//                     Sign Up
//                   </Text>
//                 </Button>
//                 <Button
//                   size={"lg"}
//                   variant={"outline"}
//                   onClick={async () => {
//                     await handleGoogleSignIn();
//                     setIsSignedIn(true);
//                   }}
//                   className="p-3  rounded-md"
//                 >
//                   Login
//                 </Button>
//               </div>
//               {/* End Buttons */}
//             </div>
//           </div>
//         </div>
//       </div>
//       {/* End Hero */}

//       <div className="relative justify-items-center pt-35 pb-5">
//         <p className="text-center text-[7px] tracking-tight lg:text-[10px] text-gray-400">
//           version 0.1
//         </p>
//       </div>
//     </>
//   );
// };
