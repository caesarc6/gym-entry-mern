import { Container, VStack } from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { supabase } from "../supabase/supabase";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { API_ENDPOINTS, apiClient } from "../config/api";
import { maybeMigrateAccount } from "../utils/migration";
import { useCustomToast } from "../hooks/useCustomToast";
import { setAuthRedirect } from "../utils/auth";
import { useIosAwareGoogleOAuth } from "../hooks/useIosAwareGoogleOAuth";
import { Card } from "../components/ui/card";
import { landingDarkMainCanvas } from "../lib/homeLandingDarkTheme";
import { cn } from "../lib/utils";

const SignUpFlow = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useCustomToast();
  const { requestGoogleOAuth, requestAppleOAuth } = useIosAwareGoogleOAuth();

  // Get the redirect path from location state, default to home
  const redirectPath = location.state?.from || "/";

  // Check if user is already signed in and redirect them
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        navigate(redirectPath, { replace: true });
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        navigate(redirectPath, { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, redirectPath]);

  const handleAppleSignIn = () => {
    requestAppleOAuth({
      authMode: "signup",
      redirectPath,
      debugContext: "SignUp",
      onError: (error) => {
        toast.error("Error", error.message || "Failed to sign up.");
      },
    });
  };

  const handleGoogleSignIn = () => {
    requestGoogleOAuth({
      authMode: "signup",
      redirectPath,
      debugContext: "SignUpFlow",
      onError: (error) => {
        toast.error(
          "Error",
          error.message || "Failed to sign in. Please try again.",
        );
      },
    });
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Error", "Email and password are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      setAuthRedirect("signup", redirectPath);
      const emailRedirectTo = `${window.location.origin}/auth/callback`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data?.session?.access_token) {
        const response = await apiClient.post(API_ENDPOINTS.PROTECTED);
        await maybeMigrateAccount(response?.data?.data);
        navigate(redirectPath, { replace: true });
      } else {
        toast.info(
          "Check your email",
          "Please verify your email address to complete signup.",
        );
        navigate("/login", { replace: true });
      }
    } catch (error) {
      toast.error("Error", error.message || "Failed to sign up.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          "w-full min-w-0 min-h-[100dvh] pb-[env(safe-area-inset-bottom)] bg-white bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200/80",
          landingDarkMainCanvas,
        )}
      >
        <Container maxW="container.xl" className="text-center" py={12}>
          <VStack
            spacing={8}
            mt={10}
            className="pt-[calc(88px+env(safe-area-inset-top))]"
          >
            <Card
              variant="mixed"
              className="w-full max-w-md mx-auto p-8 text-left shadow-sm rounded-2xl"
            >
              <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2 text-center">
                Welcome to Ethereal Gains
              </h2>
              <p className="text-center text-muted-foreground mb-6">
                Sign up with Apple, Google, or email and password.
              </p>

              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 rounded-xl min-h-11 px-4 py-3 font-semibold tracking-tight transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 bg-white text-slate-900 border border-slate-300 hover:bg-slate-50 dark:bg-white dark:text-slate-900 dark:border-slate-300 dark:hover:bg-slate-50"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </button>

              <button
                type="button"
                onClick={handleAppleSignIn}
                className="mt-3 w-full flex items-center justify-center gap-3 rounded-xl min-h-11 px-4 py-3 font-semibold tracking-tight transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 bg-black text-white border border-black hover:bg-neutral-900"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M16.7 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-.1 2.9-2.2c1.1-1.5 1.5-2.9 1.5-3 0 0-2.8-1.1-2.8-4.5zM14.8 6.5c.6-.8 1.1-1.9.9-3-.9 0-2 .6-2.6 1.4-.6.7-1.1 1.8-.9 2.9 1 .1 2-.5 2.6-1.3z"
                  />
                </svg>
                Sign in with Apple
              </button>

              <div className="my-6 text-sm text-muted-foreground text-center">
                Or sign up with email
              </div>

              <form onSubmit={handleEmailSignUp} className="space-y-3">
                <input
                  type="text"
                  placeholder="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 min-h-11 px-3 py-2.5 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:bg-white dark:text-slate-900 dark:placeholder:text-slate-500"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 min-h-11 px-3 py-2.5 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:bg-white dark:text-slate-900 dark:placeholder:text-slate-500"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 min-h-11 px-3 py-2.5 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:bg-white dark:text-slate-900 dark:placeholder:text-slate-500"
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-primary text-primary-foreground min-h-11 px-4 py-2.5 font-semibold tracking-tight hover:bg-primary/90 disabled:opacity-60"
                >
                  {isSubmitting ? "Creating account..." : "Sign up"}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() =>
                    navigate("/login", {
                      replace: true,
                      state: { from: redirectPath },
                    })
                  }
                  className="font-medium text-primary hover:underline"
                >
                  Sign in
                </button>
              </p>

              <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
                By creating an account, you agree to the{" "}
                <Link
                  to="/terms-of-service"
                  className="font-medium text-primary hover:underline"
                >
                  Terms of Service
                </Link>{" "}
                and acknowledge the{" "}
                <Link
                  to="/privacy-policy"
                  className="font-medium text-primary hover:underline"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </Card>
          </VStack>
        </Container>
      </div>
    </>
  );
};

export default SignUpFlow;
