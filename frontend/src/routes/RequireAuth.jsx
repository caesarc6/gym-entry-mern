import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Center, Spinner } from "@chakra-ui/react";
import { getCurrentAuthUser } from "../utils/auth";
import { useProductStore } from "../store/product";

const isCapacitorNative =
  typeof window !== "undefined" &&
  window.Capacitor &&
  typeof window.Capacitor.isNativePlatform === "function" &&
  window.Capacitor.isNativePlatform();

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
        <Spinner size="lg" color="blue.400" />
      </Center>
    );
  }

  if (!status.authed) {
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

