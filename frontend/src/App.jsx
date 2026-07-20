import { Box, Center } from "@chakra-ui/react";
import { LoadingIndicator } from "./components/loading";
import { lazy, Suspense, useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import "./index.css";
import HomePage from "./pages/HomePage";
import { useCanvasShell } from "./contexts/CanvasShellContext.jsx";
import MobileAppShell from "./components/MobileAppShell";
import RequireAuth from "./routes/RequireAuth";
import { useProductStore } from "./store/product";
import { isCapacitorNative as getIsCapacitorNative } from "./utils/isNativePlatform";

const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const SignUpFlow = lazy(() => import("./pages/SignUpFlow"));
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
const HeroHeader = lazy(() =>
  import("./components/hero9-header").then((m) => ({
    default: m.HeroHeader,
  }))
);

const RouteFallback = () => (
  <Center minH="40vh" py={12}>
    <LoadingIndicator variant="hero" chakraColor="blue.400" />
  </Center>
);

/** Minimal placeholder so layout does not jump while the header chunk loads. */
const HeaderFallback = () => <Box minH="64px" w="100%" aria-hidden />;

/** Tracks which main tabs the user has opened so we do not mount Analytics + Profile until needed (native perf). */
function getNativeTabVisitSet(pathname) {
  const visited = new Set();
  if (pathname === "/" || pathname === "") visited.add("feed");
  if (pathname === "/analytics") visited.add("analytics");
  if (pathname === "/profile") visited.add("profile");
  return visited;
}

function NativeTabsLayout() {
  const location = useLocation();
  const pathname = location.pathname;
  const currentUser = useProductStore((s) => s.currentUser);

  const [visitedTabs, setVisitedTabs] = useState(() =>
    getNativeTabVisitSet(location.pathname)
  );

  useEffect(() => {
    setVisitedTabs((prev) => {
      const next = new Set(prev);
      if (pathname === "/" || pathname === "") next.add("feed");
      if (pathname === "/analytics") next.add("analytics");
      if (pathname === "/profile") next.add("profile");
      return next;
    });
  }, [pathname]);

  const isFeedTab = pathname === "/";
  const isAnalyticsTab = pathname === "/analytics";
  const isProfileTab = pathname === "/profile";
  const isTabRoute = isFeedTab || isAnalyticsTab || isProfileTab;

  const mountAnalyticsTab =
    (Boolean(currentUser) || isAnalyticsTab) &&
    visitedTabs.has("analytics");
  const mountProfileTab =
    (Boolean(currentUser) || isProfileTab) && visitedTabs.has("profile");

  return (
    <>
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
  const isCapacitorNative = getIsCapacitorNative();
  const location = useLocation();
  const { paintHex, prefersReducedMotion, transition } = useCanvasShell();

  const isHomePath =
    location.pathname === "/" || location.pathname === "";
  const shellBgStyle =
    prefersReducedMotion || isHomePath
      ? { backgroundColor: paintHex }
      : { backgroundColor: paintHex, transition };

  return (
    <Box minH="100dvh" w="100%" style={shellBgStyle}>
      {!isCapacitorNative && (
        <Suspense fallback={<HeaderFallback />}>
          <HeroHeader />
        </Suspense>
      )}
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
