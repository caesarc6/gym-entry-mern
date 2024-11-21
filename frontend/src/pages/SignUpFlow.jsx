import { useState } from "react";
import {
  Box,
  Button,
  Container,
  Heading,
  Input,
  Textarea,
  useColorModeValue,
  useToast,
  VStack,
} from "@chakra-ui/react";

import { auth, googleProvider } from "../firebase"; // Adjust the import according to your project structure
import "../index.css";

const SignUpFlow = () => {
  const [username, setUsername] = useState("");
  const [step, setStep] = useState("username"); // State to control the current step
  // const { colorMode, toggleColorMode } = useColorMode();
  const [isSignedIn, setIsSignedIn] = useState(false);

  const handleUsernameSubmit = (e) => {
    e.preventDefault();
    if (username.trim() === "") {
      alert("Username is required");
      return;
    }
    setStep("google"); // Move to the Google Sign-In step
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await auth.signInWithPopup(googleProvider);
      const token = await result.user.getIdToken();

      const response = await fetch("http://localhost:5001/api/protected", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username }), // Include the username in the request body
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const userData = await response.json();
      console.log("User Data:", userData);
    } catch (error) {
      console.error("Error during sign-up:", error);
    }
  };

  return (
    <Box
      bg={useColorModeValue("gray.100", "gray.900")}
      className="relative w-screen h-screen mx-auto bg-white  flex items-center justify-center overflow-hidden top-[11px]"
    >
      <Container
        className="top-[150px] flex items-center justify-center overflow-hidden"
        style={{ position: "absolute" }}
      >
        <VStack spacing={4} align="stretch" style={{ height: "51px" }}>
          <Heading as="h1" size="2xl">
            Sign Up
          </Heading>
        </VStack>
      </Container>{" "}
      {/* Set background to white */}
      {/* Username Input */}
      <div
        className={`transform transition-all duration-900 ease-in-out absolute w-full max-w-md px-6
          ${
            step === "username"
              ? "translate-x-0 opacity-100"
              : "-translate-x-full opacity-0"
          }
        `}
      >
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
            Choose your username
          </h2>
          <form onSubmit={handleUsernameSubmit}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-50 px-4 py-3 rounded-lg border border-gray-200 text-neutral-600  font-bold focus:ring-1 focus:ring-green-300 focus:border-green-300 mb-4"
              placeholder="Enter username"
              autoFocus
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-700 text-white rounded-lg px-4 py-3 font-medium hover:bg-blue-400 
                         transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:ring-offset-2"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
      {/* Google Sign-in */}
      <div
        className={`transform transition-all duration-900 ease-in-out absolute w-full max-w-md px-6
          ${
            step === "google"
              ? "translate-x-0 opacity-100"
              : "translate-x-full opacity-0"
          }
        `}
      >
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-neutral-800 mb-2 text-center">
            Welcome, {username}!
          </h2>
          <p className="text-center text-neutral-700 mb-6">
            Complete your signup with Google
          </p>
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 
                       rounded-lg px-4 py-3 text-gray-700 font-medium hover:bg-gray-50 
                       transition-colors duration-200 focus:outline-none focus:ring-2 
                       focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    </Box>
  );
};

export default SignUpFlow;
