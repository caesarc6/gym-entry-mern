import { Box, useColorModeValue } from "@chakra-ui/react";
import { Route, Routes } from "react-router-dom";
import CreatePage from "./pages/CreatePage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import SignUpFlow from "./pages/SignUpFlow";
import ModifyProfile from "./pages/ModifyProfile";
import { HeroHeader } from "@/components/hero9-header";
import "./index.css";
import UserProfilePage from "./pages/UserProfilePage";

function App() {
  return (
    <Box minH={"100vh"} bg={useColorModeValue("gray.200", "gray.900")}>
      <HeroHeader />
      {/* <Navbar /> */}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/editProfile" element={<ModifyProfile />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/user/:userId" element={<UserProfilePage />} />
        <Route path="/signup" element={<SignUpFlow />} />
      </Routes>
    </Box>
  );
}

export default App;
