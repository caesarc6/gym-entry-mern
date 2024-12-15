import { Container, SimpleGrid, Text, VStack, Button } from "@chakra-ui/react";
import React, { useState } from "react";
import { useColorMode } from "@chakra-ui/react";
import { auth, googleProvider } from "../firebase.js"; // Adjust the import according to your project structure
import { signInWithPopup } from "firebase/auth";
import PhotoUpload from "../components/PhotoUpload.jsx"; // Adjust the import according to your project structure
import ProfilePictureUpload from "./ProfilePictureUpload.jsx";

const SignUpFlow = () => {
  const [username, setUsername] = useState("");
  const [step, setStep] = useState("username"); // State to control the current step
  const { colorMode, toggleColorMode } = useColorMode(); // Use the useColorMode hook
  const [profileImage, setProfileImage] = useState(null);

  const handleUsernameSubmit = (e) => {
    e.preventDefault();
    if (username.trim() === "") {
      alert("Username is required");
      return;
    }
    setStep("google"); // Move to the Google Sign-In step
  };

  const handleFileChange = (e) => {
    setProfileImage(e.target.files[0]);
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await auth.signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();

      const formData = new FormData();
      formData.append("username", username);
      formData.append("profilePicture", profileImage);

      const response = await fetch("http://localhost:5001/api/protected", {
        method: "POST",
        headers: {
          // "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: formData, // Include the username and profileImage in the request body
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const userData = await response.json();
      console.log("User Data:", userData);
    } catch (error) {
      console.error("Error during sign-up:", error);
    }
    // Log full response details for debugging
    // console.log("Response status:", response.status);
    // console.log(
    //   "Response headers:",
    //   Object.fromEntries(response.headers.entries())
    // );

    // Try to get response text before parsing
    //   const responseText = await response.text();
    //   console.log("Raw response:", responseText);

    //   try {
    //     // Attempt to parse as JSON
    //     const userData = JSON.parse(responseText);
    //     console.log("User Data:", userData);
    //   } catch (parseError) {
    //     console.error("Failed to parse JSON:", parseError);
    //     console.error("Received non-JSON response:", responseText);
    //   }

    //   if (!response.ok) {
    //     throw new Error(await response.text());
    //   }

    //   const userData = await response.json();
    //   console.log("User Data:", userData);
    // } catch (error) {
    //   console.error("Error during sign-up:", error);
    // }
  };

  return (
    // <div className="relative w-screen h-screen mx-auto bg-white flex items-center justify-center overflow-hidden">
    <Container
      maxW="container.xl"
      className="text-center"
      py={12}
      style={{
        display: "flex",
        flexDirection: "column",
      }}
    >
      <VStack spacing={8} mt={10}>
        {/* <Text
          fontSize={"22"}
          fontWeight={"bold"}
          bgGradient={"linear(to-r, blue.200, gray.400)"}
          bgClip={"text"}
          textAlign={"center"}
        > */}
        <div
          className={`transform transition-all duration-500 ease-in-out absolute w-full max-w-md
          ${
            step === "username"
              ? "translate-x-0 opacity-100"
              : "-translate-x-full opacity-0"
          }
        `}
        >
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">
              Choose your username
            </Text>
            <form onSubmit={handleUsernameSubmit}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 dark:bg-gray-700 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
                placeholder="Enter username"
                autoFocus
                required
              />
              <button
                type="submit"
                className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 font-medium hover:bg-blue-700 
                         transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Text>Continue</Text>
              </button>
            </form>
            <h2>Update Profile Picture</h2>
            <ProfilePictureUpload />
          </div>
        </div>

        {/* Google Sign-in */}
        <div
          className={`transform transition-all duration-500 ease-in-out absolute w-full max-w-md
          ${
            step === "google"
              ? "translate-x-0 opacity-100"
              : "translate-x-full opacity-0"
          }
        `}
        >
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">
              Welcome, {username}!
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
              Complete your signup with Google
            </p>
            {/* <PhotoUpload onUpload={setProfileImage} />{" "} */}
            <input type="file" onChange={handleFileChange} />
            {/* Use the PhotoUpload component */}
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 
                       rounded-lg px-4 py-3 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-600 
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
        {/* </Text> */}

        {/* <SimpleGrid
          columns={{
            base: 1,
            md: 2,
            lg: 3,
          }}
          spacing={10}
          w={"full"}
        ></SimpleGrid> */}
      </VStack>
      {/* Username Input */}
      {/* <div
        className={`transform transition-all duration-500 ease-in-out absolute w-full max-w-md
          ${
            step === "username"
              ? "translate-x-0 opacity-100"
              : "-translate-x-full opacity-0"
          }
        `}
      >
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">
            Choose your username
          </h2>
          <form onSubmit={handleUsernameSubmit}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-50 dark:bg-gray-700 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
              placeholder="Enter username"
              autoFocus
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 font-medium hover:bg-blue-700 
                         transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Continue
            </button>
          </form>
          <h2>Update Profile Picture</h2>
          <ProfilePictureUpload />
        </div>
      </div> */}

      {/* Google Sign-in */}
      {/* <div
        className={`transform transition-all duration-500 ease-in-out absolute w-full max-w-md
          ${
            step === "google"
              ? "translate-x-0 opacity-100"
              : "translate-x-full opacity-0"
          }
        `}
      >
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">
            Welcome, {username}!
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            Complete your signup with Google
          </p>
          <PhotoUpload onUpload={setProfileImage} />{" "} */}
      {/* Use the PhotoUpload component */}
      {/* <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 
                       rounded-lg px-4 py-3 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-600 
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
      </div> */}
      {/* </div> */}
    </Container>
  );
};

export default SignUpFlow;
