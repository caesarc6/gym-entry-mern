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
import PrivacySettings from "./components/PrivacySettings";
import AnalyticsPage from "./pages/AnalyticsPage";

function App() {
  return (
    <Box
      minH={"100vh"}
      bg={useColorModeValue("gray.200", "gray.900")}
      pb={"55px"}
    >
      <HeroHeader />
      {/* <Navbar /> */}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/editProfile" element={<ModifyProfile />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/user/:userId" element={<UserProfilePage />} />
        <Route path="/signup" element={<SignUpFlow />} />
        <Route path="/privacy" element={<PrivacySettings />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
      </Routes>
    </Box>
  );
}

export default App;
