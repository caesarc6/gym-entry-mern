import { Container, SimpleGrid, Text, VStack, Button } from "@chakra-ui/react";
import path from "path";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup } from "firebase/auth";

import { useState } from "react";
import { getAuth } from "firebase/auth";

function ProfilePictureUpload() {
  const [profilePictureUrl, setProfilePictureUrl] = useState(null);
  const [error, setError] = useState(null);

  const handleFileUpload = async (file) => {
    try {
      // Get current Firebase user
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();

      // const auth = getAuth();
      // const currentUser = auth.currentUser;

      // Get Firebase auth token
      // const token = await currentUser.getIdToken();

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("profileImage", file, file.name);

      // Send to backend
      const res = await fetch(
        "https://gym-tracker-brown.vercel.app/api/upload/uploadProfilePic",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            // "Content-Type": "multipart/form-data",
          },
          body: formData,
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Error response from server:", errorData);
        throw new Error(errorData.message || "Upload failed");
      }

      const data = await res.json();
      // Update state with new image URL
      setProfilePictureUrl(data.url);
      setError(null);
    } catch (error) {
      // console.error("Upload failed", error.response?.data || error);
      console.error("Upload failed", error.response?.data || error);
      setError(error.response?.data?.error || "Upload failed");
    }
  };

  return (
    <>
      <input
        type="file"
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) {
            handleFileUpload(file);
          }
        }}
        accept="image/*"
        className="mb-4 mt-4 p-2 border border-gray-600 rounded w-full max-w-sm text-center cursor-pointer hover:bg-slate-700 hover:text-white transition-colors duration-300 ease-in-out text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-slate-700 focus:ring-opacity-50 "
      />
      {profilePictureUrl && (
        <img src={profilePictureUrl} alt="Profile" className="mt-4" />
      )}
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </>
  );
}

export default ProfilePictureUpload;
