import React, { useEffect, useState } from "react";
import { Container, SimpleGrid, Text, VStack, Button } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { useProductStore } from "../store/product";
import ProductCard from "../components/ProductCard";
import ProfilePage from "../pages/ProfilePage";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup, signOut } from "firebase/auth";
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
    updateBlobSize();
    window.addEventListener("resize", updateBlobSize);
    return () => window.removeEventListener("resize", updateBlobSize);
  }, []);

  const handleGoogleSignIn = async (mode = "login") => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log("User signed in:", result.user);
      const token = await result.user.getIdToken();

      // First, check if user already exists in our database
      const userCheckResponse = await fetch(
        "https://gym-tracker-brown.vercel.app/api/getCurrentUser",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const userExists = userCheckResponse.ok;

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
        console.log("New user created:", userData.uid);
      }

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

      // Show appropriate success message
      if (mode === "signup") {
        alert(
          "Welcome to Ethereal Gains! Your account has been created successfully."
        );
      } else {
        alert("Successfully logged in to your account.");
      }
    } catch (error) {
      console.error("Error during sign-in:", error);
      alert("Authentication failed. Please try again.");
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
              type: "tween", // Changed from spring to tween
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
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
              type: "tween", // Changed from spring to tween
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
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
              type: "tween", // Changed from spring to tween
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut",
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
              type: "tween", // Changed from spring to tween
              duration: 9,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
      </div>
      {/* Hero */}
      <div className="relative top-36 h-[70vh] sm:h-[60vh] sm:top-48 lg:h-[50vh] content-center">
        <div className="relative justify-items-center">
          <div className="container py-10 lg:py-16">
            <div className="max-w-2xl text-center mx-auto">
              <p>All your workouts. In one place.</p>
              <div className="mt-5 max-w-2xl">
                <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                  Track Your Progress Simply.
                </h1>
              </div>
              <div className="mt-5 max-w-3xl">
                <p className="text-xl text-muted-foreground">
                  Keep track of your workouts and progress with ease. Sign up
                  now to get started.
                </p>
              </div>
              <div className="mt-8 gap-3 flex justify-center">
                <Button
                  size={"lg"}
                  onClick={() => handleGoogleSignIn("signup")}
                  className="p-3 rounded-md"
                >
                  <Text as="span" color="neutral.400">
                    Sign Up
                  </Text>
                </Button>
                <Button
                  size={"lg"}
                  variant={"outline"}
                  onClick={() => handleGoogleSignIn("login")}
                  className="p-3 rounded-md"
                >
                  Login
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
