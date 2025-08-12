import React, { useEffect, useState, useMemo } from "react";
import { Container, SimpleGrid, Text, VStack, Button } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { useProductStore } from "../store/product";
import ProductCard from "../components/ProductCard";
import ProfilePage from "../pages/ProfilePage";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { useColorModeValue } from "@chakra-ui/react";
import { motion } from "framer-motion";

export const Hero = ({ handleGoogleSignIn }) => {
  const [blobSize, setBlobSize] = useState({ width: "25rem", height: "44rem" });
  const [largeBlobSize, setLargeBlobSize] = useState({
    width: "90rem",
    height: "50rem",
  });
  const [isMobile, setIsMobile] = useState(false);

  // Memoize blob sizes to prevent unnecessary re-renders
  const memoizedBlobSize = useMemo(() => blobSize, [blobSize]);
  const memoizedLargeBlobSize = useMemo(() => largeBlobSize, [largeBlobSize]);

  const updateBlobSize = () => {
    const screenWidth = window.innerWidth;
    const mobile = screenWidth < 640;
    setIsMobile(mobile);

    if (mobile) {
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
    const debouncedResize = debounce(updateBlobSize, 100);
    window.addEventListener("resize", debouncedResize);
    return () => window.removeEventListener("resize", debouncedResize);
  }, []);

  // Simple debounce function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Simple animation variants
  const animationVariants = {
    animate: {
      y: [0, 20, -10, 0],
      scale: [1, 1.1, 0.9, 1],
      transition: {
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  const textMode = useColorModeValue("#8aa2b7", "#f9fafb");

  return (
    <>
      {/* Gradients */}
      <div aria-hidden="true" className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[#051a2b] overflow-hidden">
          {isMobile ? (
            // Mobile: Simple CSS animations
            <>
              <div
                className="absolute bg-gradient-to-r from-slate-600 to-slate-500 blur-2xl rounded-full opacity-60"
                style={{
                  top: "0px",
                  left: "30%",
                  width: memoizedBlobSize.width,
                  height: memoizedBlobSize.height,
                  animation: "mobileFloat 8s ease-in-out infinite",
                }}
              />
              <div
                className="absolute bg-gradient-to-tl from-blue-300 to-blue-200 blur-2xl rounded-full opacity-50"
                style={{
                  bottom: "0px",
                  left: "70%",
                  width: memoizedLargeBlobSize.width,
                  height: memoizedLargeBlobSize.height,
                  animation: "mobileFloat 10s ease-in-out infinite",
                  animationDelay: "2s",
                }}
              />
            </>
          ) : (
            // Desktop: Framer motion animations
            <>
              <motion.div
                className="absolute bg-gradient-to-r from-slate-600 to-slate-500 blur-3xl rounded-full"
                style={{
                  top: "-10%",
                  left: "50%",
                  width: memoizedBlobSize.width,
                  height: memoizedBlobSize.height,
                }}
                variants={animationVariants}
                animate="animate"
              />
              <motion.div
                className="absolute bg-gradient-to-tl from-blue-300 to-blue-200 blur-3xl rounded-full"
                style={{
                  top: "-20%",
                  left: "50%",
                  width: memoizedLargeBlobSize.width,
                  height: memoizedLargeBlobSize.height,
                }}
                variants={animationVariants}
                animate="animate"
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className="absolute bg-gradient-to-r from-slate-600 to-slate-500 blur-3xl rounded-full"
                style={{
                  bottom: "-30%",
                  left: "20%",
                  width: memoizedBlobSize.width,
                  height: memoizedBlobSize.height,
                }}
                variants={animationVariants}
                animate="animate"
                transition={{
                  duration: 7,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className="absolute bg-gradient-to-tl from-blue-300 to-blue-200 blur-3xl rounded-full"
                style={{
                  bottom: "-36%",
                  right: "54%",
                  width: memoizedLargeBlobSize.width,
                  height: memoizedLargeBlobSize.height,
                }}
                variants={animationVariants}
                animate="animate"
                transition={{
                  duration: 9,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* CSS Animation Keyframes */}
      {/*
      <style jsx>{`
        @keyframes mobileFloat {
          0%,
          100% {
            transform: translateY(0px) scale(1);
          }
          25% {
            transform: translateY(10px) scale(1.05);
          }
          50% {
            transform: translateY(-5px) scale(0.95);
          }
          75% {
            transform: translateY(5px) scale(1.02);
          }
        }
      `}</style>
      */}

      {/* Hero */}
      <div className="relative top-36 h-[70vh] sm:h-[60vh] sm:top-48 lg:h-[50vh] content-center">
        <div className="relative justify-items-center">
          <div className="container py-10 lg:py-16">
            <div className="max-w-2xl text-center mx-auto">
              <p className="text-gray-300 text-lg">
                All your workouts. In one place.
              </p>
              <div className="mt-5 max-w-2xl">
                <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl text-white">
                  Track Your Progress Simply.
                </h1>
              </div>
              <div className="mt-5 max-w-3xl">
                <p className="text-xl text-gray-400">
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
