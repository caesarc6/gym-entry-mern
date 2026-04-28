import { Box, Spinner, Center } from "@chakra-ui/react";
import { lazy, Suspense } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { HeroHeader } from "./components/hero9-header";
import "./index.css";
import { useTheme } from "./contexts/ThemeContext";
import AuthCallback from "./pages/AuthCallback";
import HomePage from "./pages/HomePage";
import MobileAppShell from "./components/MobileAppShell";
import RequireAuth from "./routes/RequireAuth";
import SignUpFlow from "./pages/SignUpFlow";
import { useProductStore } from "./store/product";
import { isCapacitorNative as getIsCapacitorNative } from "./utils/isNativePlatform";

const CreatePage = lazy(() => import("./pages/CreatePage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const Login = lazy(() => import("./pages/Login"));
const ModifyProfile = lazy(() => import("./pages/ModifyProfile"));
const UserProfilePage = lazy(() => import("./pages/UserProfilePage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const SharedWorkoutPage = lazy(() => import("./pages/SharedWorkoutPage"));
const TrainerDashboard = lazy(() => import("./pages/TrainerDashboard"));
const CreateSharedWorkout = lazy(() => import("./pages/CreateSharedWorkout"));
const ClientWorkoutsPage = lazy(() => import("./pages/ClientWorkoutsPage"));
const ClientClaimPage = lazy(() => import("./pages/ClientClaimPage"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));

const RouteFallback = () => (
  <Center minH="40vh" py={12}>
    <Spinner size="lg" color="blue.400" />
  </Center>
);

function NativeTabsLayout() {
  const location = useLocation();
  const pathname = location.pathname;
  const currentUser = useProductStore((s) => s.currentUser);

  const isFeedTab = pathname === "/";
  const isAnalyticsTab = pathname === "/analytics";
  const isProfileTab = pathname === "/profile";
  const isTabRoute = isFeedTab || isAnalyticsTab || isProfileTab;

  // Signed-out on feed: do not mount other tabs yet. Hidden tabs used to mount RequireAuth
  // and redirect the whole app away from the guest feed. Signed-in users keep all tabs mounted.
  const mountAnalyticsTab = Boolean(currentUser) || isAnalyticsTab;
  const mountProfileTab = Boolean(currentUser) || isProfileTab;

  return (
    <>
      {/* Keep main tabs mounted for signed-in users (native-like tab state). */}
      <div style={{ display: isFeedTab ? "block" : "none" }}>
        <HomePage />
      </div>
      {mountAnalyticsTab ? (
        <div style={{ display: isAnalyticsTab ? "block" : "none" }}>
          <Suspense fallback={<RouteFallback />}>
            <RequireAuth>
              <AnalyticsPage />
            </RequireAuth>
          </Suspense>
        </div>
      ) : null}
      {mountProfileTab ? (
        <div style={{ display: isProfileTab ? "block" : "none" }}>
          <Suspense fallback={<RouteFallback />}>
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          </Suspense>
        </div>
      ) : null}

      {/* Non-tab routes render normally (they can mount/unmount) */}
      {!isTabRoute && (
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route
            path="/notifications"
            element={
              <RequireAuth>
                <NotificationsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/create"
            element={
              <RequireAuth>
                <CreatePage />
              </RequireAuth>
            }
          />
          <Route
            path="/editProfile"
            element={
              <RequireAuth>
                <ModifyProfile />
              </RequireAuth>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <SettingsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/user/:userId"
            element={
              <RequireAuth>
                <UserProfilePage />
              </RequireAuth>
            }
          />
          <Route
            path="/shared-workout/:shareToken"
            element={
              <RequireAuth>
                <SharedWorkoutPage />
              </RequireAuth>
            }
          />
          <Route
            path="/client-claim/:shareToken"
            element={
              <RequireAuth>
                <ClientClaimPage />
              </RequireAuth>
            }
          />
          <Route
            path="/trainer/dashboard"
            element={
              <RequireAuth>
                <TrainerDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/trainer/create-shared-workout"
            element={
              <RequireAuth>
                <CreateSharedWorkout />
              </RequireAuth>
            }
          />
          <Route
            path="/trainer/client/:clientName"
            element={
              <RequireAuth>
                <ClientWorkoutsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <RequireAuth>
                <AdminDashboard />
              </RequireAuth>
            }
          />
        </Routes>
        </Suspense>
      )}
    </>
  );
}

function App() {
  const { currentTheme } = useTheme();
  const isCapacitorNative = getIsCapacitorNative();

  const getBackgroundStyle = () => {
    switch (currentTheme) {
      case "light":
        return {
          bgGradient: "linear(235deg, #e5e7eb, #f3f4f6, #e5e7eb)",
          backgroundAttachment: "fixed",
        };
      case "dark":
        return { bg: "#070708" };
      case "dark-black":
        return {
          bgGradient: "linear(305deg, #000000, #0f0f10, #000000)",
          backgroundAttachment: "fixed",
        };
      case "dark-blue":
        return {
          bg: "#050508",
          backgroundAttachment: "fixed",
        };
      default:
        return { bg: "gray.200" };
    }
  };

  return (
    <Box minH={"100vh"} {...getBackgroundStyle()}>
      {!isCapacitorNative && <HeroHeader />}
      {isCapacitorNative ? (
        <MobileAppShell>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/signup" element={<SignUpFlow />} />
              <Route path="/login" element={<Login />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/*" element={<NativeTabsLayout />} />
            </Routes>
          </Suspense>
        </MobileAppShell>
      ) : (
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/editProfile" element={<ModifyProfile />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/user/:userId" element={<UserProfilePage />} />
            <Route path="/signup" element={<SignUpFlow />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/notifications" element={<NotificationsPage />} />
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
        </Suspense>
      )}
    </Box>
  );
}

export default App;
