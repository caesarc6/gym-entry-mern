import { Box, useColorModeValue, Text } from "@chakra-ui/react";
import { Route, Routes } from "react-router-dom";
import CreatePage from "./pages/CreatePage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import SignUpFlow from "./pages/SignUpFlow";
import ModifyProfile from "./pages/ModifyProfile";
import { HeroHeader } from "./components/hero9-header";
import "./index.css";
import UserProfilePage from "./pages/UserProfilePage";
import PrivacySettings from "./components/PrivacySettings";
import AnalyticsPage from "./pages/AnalyticsPage";
import SharedWorkoutPage from "./pages/SharedWorkoutPage";
import TrainerDashboard from "./pages/TrainerDashboard";
import CreateSharedWorkout from "./pages/CreateSharedWorkout";
import ClientWorkoutsPage from "./pages/ClientWorkoutsPage";
import ClientClaimPage from "./pages/ClientClaimPage";
import AdminDashboard from "./pages/AdminDashboard";
import { useTheme } from "./contexts/ThemeContext";

function App() {
  const { currentTheme } = useTheme();

  const getBackgroundStyle = () => {
    switch (currentTheme) {
      case "light":
        return {
          bgGradient: "linear(235deg, #e5e7eb, #f3f4f6, #e5e7eb)",
          backgroundAttachment: "fixed",
        };
      case "dark":
        return { bg: "gray.900" };
      case "dark-black":
        return {
          bgGradient: "linear(305deg, #000000, #0d101a, #000000)",
          backgroundAttachment: "fixed",
        };
      case "dark-blue":
        return {
          bgGradient: "linear(to-b, #050810, #0d1220)",
          backgroundAttachment: "fixed",
        };
      default:
        return { bg: "gray.200" };
    }
  };

  return (
    <Box minH={"100vh"} {...getBackgroundStyle()} pb={"55px"}>
      <HeroHeader />
      {/* <Text p={4} textAlign="center" fontSize="2xl" fontWeight="bold">
        App is loading...
      </Text> */}
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
        <Route
          path="/shared-workout/:shareToken"
          element={<SharedWorkoutPage />}
        />
        <Route
          path="/client-claim/:shareToken"
          element={<ClientClaimPage />}
        />
        <Route path="/trainer/dashboard" element={<TrainerDashboard />} />
        <Route
          path="/trainer/create-shared-workout"
          element={<CreateSharedWorkout />}
        />
        <Route
          path="/trainer/client/:clientName"
          element={<ClientWorkoutsPage />}
        />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Routes>
    </Box>
  );
}

export default App;
