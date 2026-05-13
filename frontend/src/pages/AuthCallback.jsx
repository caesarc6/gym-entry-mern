import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Center,
  Container,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LoadingIndicator } from "../components/loading";
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

const GET_SESSION_MS = 25_000;

const AuthCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  /** useCustomToast() returns a fresh object each render — must not live in effect deps or OAuth restarts mid-flight on every setState. */
  const toast = useCustomToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const [errorMessage, setErrorMessage] = useState(null);
  const hasHandledRef = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      const toast = toastRef.current;
      if (hasHandledRef.current) {
        return;
      }
      hasHandledRef.current = true;
      let aborted = false;

      const getSessionWithTimeout = async (label) => {
        try {
          return await Promise.race([
            supabase.auth.getSession(),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error(`getSession timeout (${label})`)),
                GET_SESSION_MS
              )
            ),
          ]);
        } catch (err) {
          pushAuthDebug(`AuthCallback: getSession error (${label})`, {
            message: err?.message,
          });
          return { data: { session: null }, error: err };
        }
      };

      const locationPayload = {
        href: window.location.href,
        search: location.search,
        hash: location.hash,
        origin: window.location.origin,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      };
      pushAuthDebug("AuthCallback: location", locationPayload);

      // Must exceed Supabase steps + apiClient timeout: cold API can take 15–30s+.
      const backendTimeoutMs = apiClient.defaults.timeout ?? 30000;
      const authFailSafeMs = backendTimeoutMs + 35000;

      const failSafeTimer = setTimeout(() => {
        aborted = true;
        toast.error(
          "Authentication Timeout",
          "Login took too long. Please try again."
        );
        setErrorMessage("Authentication timed out. Please try again.");
      }, authFailSafeMs);

      const params = new URLSearchParams(location.search);
      const hashParams = new URLSearchParams(location.hash.replace("#", ""));
      const rawParams = {
        searchParams: Object.fromEntries(params.entries()),
        hashParams: Object.fromEntries(hashParams.entries()),
      };
      pushAuthDebug("AuthCallback: raw params", rawParams);
      const stored = consumeAuthRedirect();
      const mode = params.get("mode") || stored.mode || "login";
      const redirectParam = params.get("redirect");
      const redirectTo = redirectParam
        ? decodeURIComponent(redirectParam)
        : stored.redirectTo || "/";
      // Capture before any await: Supabase may strip ?code= during PKCE auto-detection.
      const codeAtStart = new URLSearchParams(location.search).get("code");
      const code = codeAtStart;
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

      try {
        if (authError) {
          throw new Error(
            authErrorDescription
              ? decodeURIComponent(authErrorDescription)
              : authError
          );
        }

        // getSession() awaits Supabase init, which runs detectSessionInUrl and exchanges
        // PKCE ?code= before we read the URL again — so "missing code" was a false negative.
        const { data: sessionAfterInit } = await getSessionWithTimeout("init");
        if (aborted) return;
        let resolvedSession = sessionAfterInit?.session || null;
        let hasAccessToken = Boolean(resolvedSession?.access_token);

        if (hasAccessToken) {
          pushAuthDebug("AuthCallback: session after init (PKCE / storage)", {
            source: "detectSessionInUrl_or_existing",
          });
        } else if (codeAtStart) {
          pushAuthDebug("AuthCallback: exchanging code (fallback)", null);
          const exchangeResult = await Promise.race([
            supabase.auth.exchangeCodeForSession(codeAtStart),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Auth exchange timeout")), 10000)
            ),
          ]);
          if (aborted) return;
          const exchangePayload = {
            hasSession: Boolean(exchangeResult?.data?.session),
            error: exchangeResult?.error?.message,
          };
          pushAuthDebug("AuthCallback: exchange result", exchangePayload);
          if (exchangeResult?.error) {
            throw exchangeResult.error;
          }
          if (exchangeResult?.data?.session) {
            resolvedSession = exchangeResult.data.session;
          }
          hasAccessToken = Boolean(resolvedSession?.access_token);
        } else if (location.hash) {
          const hashErr = hashParams.get("error");
          const hashErrDesc = hashParams.get("error_description");
          if (hashErr) {
            throw new Error(
              hashErrDesc
                ? decodeURIComponent(hashErrDesc.replace(/\+/g, " "))
                : hashErr
            );
          }

          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          let expiresAt = hashParams.get("expires_at");
          if (!expiresAt) {
            const expiresInRaw = hashParams.get("expires_in");
            if (expiresInRaw != null && expiresInRaw !== "") {
              const sec = Number(expiresInRaw);
              if (Number.isFinite(sec)) {
                expiresAt = String(Math.floor(Date.now() / 1000) + sec);
              }
            }
          }
          const hashPayload = {
            hasAccessToken: Boolean(accessToken),
            hasRefreshToken: Boolean(refreshToken),
            expiresAt,
          };
          pushAuthDebug("AuthCallback: hash session", hashPayload);

          if (accessToken && refreshToken) {
            setTempSupabaseSession(accessToken, refreshToken, expiresAt);
            const userProbe = await Promise.race([
              supabase.auth.getUser(accessToken),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Auth user probe timeout")), 10000)
              ),
            ]);
            if (aborted) return;
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
            if (aborted) return;

            if (setResult) {
              const setSessionPayload = {
                hasSession: Boolean(setResult?.data?.session),
                error: setResult?.error?.message,
              };
              pushAuthDebug(
                "AuthCallback: setSession result",
                setSessionPayload
              );
              if (setResult?.error) {
                throw setResult.error;
              }
              if (setResult?.data?.session?.access_token) {
                hasAccessToken = true;
                resolvedSession = setResult.data.session;
              }
            }
          }
          if (!hasAccessToken) {
            const { data: afterHash } = await getSessionWithTimeout("afterHash");
            if (aborted) return;
            if (afterHash?.session?.access_token) {
              resolvedSession = afterHash.session;
            }
            hasAccessToken = Boolean(afterHash?.session?.access_token);
          }
        }

        if (!hasAccessToken) {
          const { data: finalCheck } = await getSessionWithTimeout("finalCheck");
          if (aborted) return;
          if (finalCheck?.session?.access_token) {
            resolvedSession = finalCheck.session;
          }
          hasAccessToken = Boolean(finalCheck?.session?.access_token);
        }

        if (!hasAccessToken) {
          const example = `${window.location.origin}/auth/callback`;
          throw new Error(
            `Missing auth code from Supabase. In the Supabase dashboard, add ${example} under Authentication → URL Configuration → Redirect URLs (and matching Site URL), then retry.`
          );
        }

        const waitForSession = async () => {
          const { data: { session } } = await getSessionWithTimeout("waitStart");
          if (aborted) return null;
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

        if (!resolvedSession?.access_token) {
          const waited = await waitForSession();
          if (aborted) return;
          resolvedSession = waited || resolvedSession;
        }

        const session = resolvedSession;
        if (aborted) return;
        const sessionPayload = {
          hasAccessToken: Boolean(session?.access_token),
          provider: session?.user?.app_metadata?.provider,
          userId: session?.user?.id,
          expiresAt: session?.expires_at,
        };
        pushAuthDebug("AuthCallback: session", sessionPayload);
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

        const response = await Promise.race([
          apiClient.post(API_ENDPOINTS.PROTECTED),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Backend timeout")),
              backendTimeoutMs
            )
          ),
        ]);
        if (aborted) return;
        const backendPayload = {
          status: response?.status,
          created: response?.data?.created,
        };
        pushAuthDebug("AuthCallback: backend response", backendPayload);
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
        const apiBody = error?.response?.data;
        const apiHint =
          (apiBody && typeof apiBody.message === "string" && apiBody.message) ||
          (apiBody?.error && typeof apiBody.error === "string" && apiBody.error) ||
          null;
        const userMessage =
          apiHint ||
          error.message ||
          "Please try again.";
        const tempToken = getTempAccessToken();
        if (!tempToken) {
          await signOutAll();
        }
        toast.error("Authentication Failed", userMessage);
        setErrorMessage(userMessage);
      } finally {
        clearTimeout(failSafeTimer);
      }
    };

    clearAuthDebug();
    handleCallback();
  }, [location.pathname, location.search, location.hash, navigate]);

  return (
    <Container maxW="container.md" py={16}>
      <Center minH="60vh">
        {errorMessage ? (
          <VStack spacing={4} align="center" maxW="md" textAlign="center">
            <Text>{errorMessage}</Text>
            <Button
              onClick={() => navigate("/", { replace: true })}
              size="sm"
            >
              Back to home
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Retry login
            </Button>
          </VStack>
        ) : (
          <VStack spacing={4} align="center" textAlign="center" w="full">
            <LoadingIndicator variant="hero" chakraColor="blue.400" />
            <Box minH="12vh" w="full" aria-busy="true" />
          </VStack>
        )}
      </Center>
    </Container>
  );
};

export default AuthCallback;
