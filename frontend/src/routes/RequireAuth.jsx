import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Center } from "@chakra-ui/react";
import { LoadingIndicator } from "../components/loading";
import { getCurrentAuthUser } from "../utils/auth";
import { useProductStore } from "../store/product";
import SignedOutTabPrompt from "../components/SignedOutTabPrompt";

const isCapacitorNative =
  typeof window !== "undefined" &&
  window.Capacitor &&
  typeof window.Capacitor.isNativePlatform === "function" &&
  window.Capacitor.isNativePlatform();

function nativeTabAuthVariant(pathname) {
  if (pathname === "/create" || pathname.startsWith("/create/")) {
    return "create";
  }
  if (pathname === "/analytics" || pathname.startsWith("/analytics/")) {
    return "analytics";
  }
  if (pathname === "/profile" || pathname.startsWith("/profile/")) {
    return "profile";
  }
  return null;
}

export default function RequireAuth({ children }) {
  const location = useLocation();
  const currentUser = useProductStore((s) => s.currentUser);
  const authBootstrapCompleteAt = useProductStore(
    (s) => s.authBootstrapCompleteAt,
  );
  const [status, setStatus] = useState(() => ({
    ready: Boolean(currentUser),
    authed: Boolean(currentUser),
  }));

  useEffect(() => {
    if (currentUser) {
      setStatus({ ready: true, authed: true });
      return;
    }

    // Native shell always mounts HomePage, which runs the canonical auth probe once.
    // Avoid a second serialized getCurrentAuthUser + spinner on every protected tab.
    if (isCapacitorNative) {
      if (!authBootstrapCompleteAt) {
        return;
      }
      setStatus({ ready: true, authed: false });
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const user = await getCurrentAuthUser();
        if (!mounted) return;
        setStatus({ ready: true, authed: Boolean(user) });
      } catch {
        if (!mounted) return;
        setStatus({ ready: true, authed: false });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [currentUser, authBootstrapCompleteAt]);

  if (!status.ready) {
    return (
      <Center minH="40vh" py={12}>
        <LoadingIndicator variant="hero" chakraColor="blue.400" />
      </Center>
    );
  }

  if (!status.authed) {
    if (isCapacitorNative) {
      const tabVariant = nativeTabAuthVariant(location.pathname);
      if (tabVariant) {
        return <SignedOutTabPrompt variant={tabVariant} />;
      }
    }
    const guestPath = isCapacitorNative ? "/signup" : "/login";
    return (
      <Navigate
        to={guestPath}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return children;
}

