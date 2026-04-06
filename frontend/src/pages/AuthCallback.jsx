import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Container, Spinner, Text, VStack } from "@chakra-ui/react";
import { supabase } from "../supabase/supabase";
import { API_ENDPOINTS, apiClient } from "../config/api";
import { maybeMigrateAccount } from "../utils/migration";
import {
  clearAuthDebug,
  consumeAuthRedirect,
  getTempAccessToken,
  pushAuthDebug,
  setTempSupabaseSession,
  signOutAll,
} from "../utils/auth";
import { useCustomToast } from "../hooks/useCustomToast";

const AuthCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useCustomToast();
  const [statusMessage, setStatusMessage] = useState("Finishing sign-in...");
  const hasHandledRef = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      if (hasHandledRef.current) {
        return;
      }
      hasHandledRef.current = true;

      const locationPayload = {
        href: window.location.href,
        search: location.search,
        hash: location.hash,
        origin: window.location.origin,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      };
      pushAuthDebug("AuthCallback: location", locationPayload);
      console.debug("[AuthCallback] location", locationPayload);

      const failSafeTimer = setTimeout(() => {
        toast.error(
          "Authentication Timeout",
          "Login took too long. Please try again."
        );
        setStatusMessage("Authentication timeout. See debug details below.");
      }, 20000);

      const params = new URLSearchParams(location.search);
      const hashParams = new URLSearchParams(location.hash.replace("#", ""));
      const rawParams = {
        searchParams: Object.fromEntries(params.entries()),
        hashParams: Object.fromEntries(hashParams.entries()),
      };
      pushAuthDebug("AuthCallback: raw params", rawParams);
      console.debug("[AuthCallback] raw params", rawParams);
      const stored = consumeAuthRedirect();
      const mode = params.get("mode") || stored.mode || "login";
      const redirectParam = params.get("redirect");
      const redirectTo = redirectParam
        ? decodeURIComponent(redirectParam)
        : stored.redirectTo || "/";
      const code = params.get("code");
      const authError = params.get("error");
      const authErrorDescription = params.get("error_description");

      const parsedParams = {
        mode,
        redirectTo,
        hasCode: Boolean(code),
        storedMode: stored.mode,
        storedRedirect: stored.redirectTo,
        authError,
        authErrorDescription,
      };
      pushAuthDebug("AuthCallback: parsed params", parsedParams);
      console.debug("[AuthCallback] params", parsedParams);

      try {
        if (authError) {
          throw new Error(
            authErrorDescription
              ? decodeURIComponent(authErrorDescription)
              : authError
          );
        }

        setStatusMessage("Completing authentication...");
        if (code) {
          pushAuthDebug("AuthCallback: exchanging code", null);
          console.debug("[AuthCallback] exchanging code for session");
          const exchangeResult = await Promise.race([
            supabase.auth.exchangeCodeForSession(code),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Auth exchange timeout")), 10000)
            ),
          ]);
          const exchangePayload = {
            hasSession: Boolean(exchangeResult?.data?.session),
            error: exchangeResult?.error?.message,
          };
          pushAuthDebug("AuthCallback: exchange result", exchangePayload);
          console.debug("[AuthCallback] exchange result", exchangePayload);
          if (exchangeResult?.error) {
            throw exchangeResult.error;
          }
        } else if (location.hash) {
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          const expiresAt = hashParams.get("expires_at");
          const hashPayload = {
            hasAccessToken: Boolean(accessToken),
            hasRefreshToken: Boolean(refreshToken),
            expiresAt,
          };
          pushAuthDebug("AuthCallback: hash session", hashPayload);
          console.debug("[AuthCallback] hash session", hashPayload);

          if (accessToken && refreshToken) {
            setTempSupabaseSession(accessToken, refreshToken, expiresAt);
            const userProbe = await Promise.race([
              supabase.auth.getUser(accessToken),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Auth user probe timeout")), 10000)
              ),
            ]);
            pushAuthDebug("AuthCallback: user probe", {
              hasUser: Boolean(userProbe?.data?.user),
              error: userProbe?.error?.message,
            });

            let setResult = null;
            try {
              setResult = await Promise.race([
                supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                }),
                new Promise((_, reject) =>
                  setTimeout(
                    () => reject(new Error("Auth session timeout")),
                    20000
                  )
                ),
              ]);
            } catch (setError) {
              pushAuthDebug("AuthCallback: setSession timeout", {
                message: setError?.message,
              });
            }

            if (setResult) {
              const setSessionPayload = {
                hasSession: Boolean(setResult?.data?.session),
                error: setResult?.error?.message,
              };
              pushAuthDebug(
                "AuthCallback: setSession result",
                setSessionPayload
              );
              console.debug(
                "[AuthCallback] setSession result",
                setSessionPayload
              );
              if (setResult?.error) {
                throw setResult.error;
              }
            }
          }
        } else {
          throw new Error(
            "Missing auth code from Supabase. Check Auth URL configuration and retry login."
          );
        }

        const waitForSession = async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            return session;
          }

          return new Promise((resolve) => {
            const { data: { subscription } } = supabase.auth.onAuthStateChange(
              (_event, nextSession) => {
                if (nextSession?.access_token) {
                  subscription.unsubscribe();
                  resolve(nextSession);
                }
              }
            );

            setTimeout(() => {
              subscription.unsubscribe();
              resolve(null);
            }, 10000);
          });
        };

        setStatusMessage("Waiting for session...");
        const session = await waitForSession();
        const sessionPayload = {
          hasAccessToken: Boolean(session?.access_token),
          provider: session?.user?.app_metadata?.provider,
          userId: session?.user?.id,
          expiresAt: session?.expires_at,
        };
        pushAuthDebug("AuthCallback: session", sessionPayload);
        console.debug("[AuthCallback] session", sessionPayload);
        const tempToken = getTempAccessToken();
        if (!session?.access_token && tempToken) {
          pushAuthDebug("AuthCallback: temp token fallback", {
            hasTempToken: true,
          });
          apiClient.defaults.headers.common.Authorization = `Bearer ${tempToken}`;
        } else if (!session?.access_token) {
          throw new Error("Missing Supabase session");
        } else {
          apiClient.defaults.headers.common.Authorization = `Bearer ${session.access_token}`;
        }

        setStatusMessage("Syncing account...");
        const response = await Promise.race([
          apiClient.post(API_ENDPOINTS.PROTECTED),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Backend timeout")), 10000)
          ),
        ]);
        const backendPayload = {
          status: response?.status,
          created: response?.data?.created,
        };
        pushAuthDebug("AuthCallback: backend response", backendPayload);
        console.debug("[AuthCallback] backend response", backendPayload);
        const wasCreated = response?.data?.created === true;
        const userData = response?.data?.data;

        if (mode === "login" && wasCreated) {
          await signOutAll();
          toast.error(
            "Account Not Found",
            "No account found for this Google account. Please sign up first."
          );
          navigate("/", { replace: true });
          return;
        }

        if (mode === "signup" && !wasCreated) {
          toast.info(
            "Account Already Exists",
            "An account already exists for this Google account. You're logged in."
          );
        }

        await maybeMigrateAccount(userData);

        setStatusMessage("Redirecting...");
        navigate(redirectTo, { replace: true });
      } catch (error) {
        pushAuthDebug("AuthCallback: error", {
          message: error?.message,
          name: error?.name,
          location: {
            href: window.location.href,
            search: location.search,
            hash: location.hash,
          },
          rawParams,
          parsedParams,
        });
        console.error("[AuthCallback] error", error);
        const tempToken = getTempAccessToken();
        if (!tempToken) {
          await signOutAll();
        }
        toast.error(
          "Authentication Failed",
          error.message || "Please try again."
        );
        setStatusMessage(
          `Authentication failed: ${error.message || "Please try again."}`
        );
      } finally {
        clearTimeout(failSafeTimer);
      }
    };

    clearAuthDebug();
    handleCallback();
  }, [location.search, navigate, toast]);

  return (
    <Container maxW="container.md" py={16}>
      <VStack spacing={4} align="stretch">
        <Spinner />
        <Text>{statusMessage}</Text>
        <Button
          onClick={() => navigate("/", { replace: true })}
          alignSelf="flex-start"
          size="sm"
        >
          Back to home
        </Button>
      </VStack>
    </Container>
  );
};

export default AuthCallback;
