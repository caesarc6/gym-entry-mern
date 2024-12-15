import { Container, SimpleGrid, Text, VStack, Button } from "@chakra-ui/react";
import { useState } from "react";
import axios from "axios";
// import { auth } from "../firebase";
import { getAuth } from "firebase/auth";
// import { createClient } from "@supabase/supabase-js";
// import path from "path";
// import multer from "multer";
// import path from "path";
import { createClient } from "@supabase/supabase-js";
// import User from "../models/user.model.js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function ProfilePictureUpload() {
  const [profilePictureUrl, setProfilePictureUrl] = useState(null);
  const [error, setError] = useState(null);

  const handleFileUpload = async (file) => {
    try {
      // Get current Firebase user
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      // Get Firebase auth token
      const token = await currentUser.getIdToken();

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("profilePicture", file, file.name);

      // Debug: Log the file details
      console.log("File to upload:", {
        name: file.name,
        type: file.type,
        size: file.size,
      });
      // List all buckets to confirm names
      // const { data, error } = await supabase.storage.listBuckets();
      // if (error) console.error("Error listing buckets:", error);
      // else console.log("Available buckets:", data);
      // Send to backend
      const res = await axios.post(
        "http://localhost:5001/api/upload/uploadProfilePic",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Update state with new image URL
      setProfilePictureUrl(res.data.url);
      setError(null);
    } catch (error) {
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
      {error && <p style={{ color: "red" }}>{error}</p>}
      {profilePictureUrl && (
        <img
          src={profilePictureUrl}
          alt="Profile"
          style={{ width: "100px", height: "100px", borderRadius: "50%" }}
        />
      )}
    </>
  );
}
//   // State to manage the profile picture URL
//   const [profilePictureUrl, setProfilePictureUrl] = useState(null);

//   const handleFileUpload = async (file) => {
//     try {
//       // Get Firebase auth token
//       const token = await auth.currentUser.getIdToken();

//       // Create FormData for file upload
//       // const formData = new FormData();
//       const formData = file;
//       // formData.append("profilePicture", file);

//       // Send to backend
//       // const res = await fetch(
//       //   "http://localhost:5001/api/upload/uploadProfilePic",
//       //   {
//       //     method: "POST",
//       //     headers: {
//       //       "Content-Type": "multipart/form-data",
//       //       Authorization: `Bearer ${token}`,
//       //     },
//       //     body: JSON.stringify(formData),
//       //   }
//       // );

//       const res = await axios.post(
//         "http://localhost:5001/api/upload/uploadProfilePic",
//         formData,
//         {
//           headers: {
//             Authorization: token,
//             "Content-Type": "multipart/form-data",
//           },
//         }
//       );

//       // Update state with new image URL
//       setProfilePictureUrl(res.data.url);
//     } catch (error) {
//       console.error("Upload failed", error);
//     }
//   };

//   return (
//     <div>
//       <input
//         type="file"
//         onChange={(e) => handleFileUpload(e.target.files[0])}
//         accept="image/*"
//       />
//       {profilePictureUrl && (
//         <img
//           src={profilePictureUrl}
//           alt="Profile"
//           style={{ width: "100px", height: "100px", borderRadius: "50%" }}
//         />
//       )}
//     </div>
//   );
// }

export default ProfilePictureUpload;
