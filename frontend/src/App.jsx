import { Box, useColorModeValue } from "@chakra-ui/react";
import { Route, Routes } from "react-router-dom";
import CreatePage from "./pages/CreatePage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import Navbar from "./components/Navbar";
import SignUpFlow from "./pages/SignUpFlow";
import ModifyProfile from "./pages/ModifyProfile";
import { HeroHeader } from "@/components/hero9-header";
import "./index.css";

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
        <Route path="/signup" element={<SignUpFlow />} />
      </Routes>
    </Box>
  );
}

export default App;
