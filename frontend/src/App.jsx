import { Box, Spinner, Center } from "@chakra-ui/react";
import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { HeroHeader } from "./components/hero9-header";
import "./index.css";
import { useTheme } from "./contexts/ThemeContext";

const CreatePage = lazy(() => import("./pages/CreatePage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SignUpFlow = lazy(() => import("./pages/SignUpFlow"));
const Login = lazy(() => import("./pages/Login"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ModifyProfile = lazy(() => import("./pages/ModifyProfile"));
const UserProfilePage = lazy(() => import("./pages/UserProfilePage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const SharedWorkoutPage = lazy(() => import("./pages/SharedWorkoutPage"));
const TrainerDashboard = lazy(() => import("./pages/TrainerDashboard"));
const CreateSharedWorkout = lazy(() => import("./pages/CreateSharedWorkout"));
const ClientWorkoutsPage = lazy(() => import("./pages/ClientWorkoutsPage"));
const ClientClaimPage = lazy(() => import("./pages/ClientClaimPage"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

const RouteFallback = () => (
  <Center minH="40vh" py={12}>
    <Spinner size="lg" color="blue.400" />
  </Center>
);

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
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/editProfile" element={<ModifyProfile />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/user/:userId" element={<UserProfilePage />} />
          <Route path="/signup" element={<SignUpFlow />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route
            path="/shared-workout/:shareToken"
            element={<SharedWorkoutPage />}
          />
          <Route path="/client-claim/:shareToken" element={<ClientClaimPage />} />
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
      </Suspense>
    </Box>
  );
}

export default App;
