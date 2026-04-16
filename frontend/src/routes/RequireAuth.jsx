import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Center, Spinner } from "@chakra-ui/react";
import { getCurrentAuthUser } from "../utils/auth";

export default function RequireAuth({ children }) {
  const location = useLocation();
  const [status, setStatus] = useState({ ready: false, authed: false });

  useEffect(() => {
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
  }, []);

  if (!status.ready) {
    return (
      <Center minH="40vh" py={12}>
        <Spinner size="lg" color="blue.400" />
      </Center>
    );
  }

  if (!status.authed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

