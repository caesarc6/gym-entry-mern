import { Container, Text, VStack } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabase/supabase";
import { API_ENDPOINTS, apiClient } from "../config/api";
import { maybeMigrateAccount } from "../utils/migration";
import { useCustomToast } from "../hooks/useCustomToast";
import { useIosAwareGoogleOAuth } from "../hooks/useIosAwareGoogleOAuth";
import { Card } from "../components/ui/card";
import { landingDarkMainCanvas } from "../lib/homeLandingDarkTheme";
import { cn } from "../lib/utils";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useCustomToast();
  const { requestGoogleOAuth } = useIosAwareGoogleOAuth();

  const redirectPath = location.state?.from || "/";

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

  const handleGoogleLogin = () => {
    requestGoogleOAuth({
      authMode: "login",
      redirectPath,
      debugContext: "Login",
      onError: (error) => {
        toast.error("Error", error.message || "Failed to sign in.");
      },
    });
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Error", "Email and password are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      const response = await apiClient.post(API_ENDPOINTS.PROTECTED);
      await maybeMigrateAccount(response?.data?.data);
      toast.success("Success", "Signed in successfully.");
      navigate(redirectPath, { replace: true });
    } catch (error) {
      toast.error("Error", error.message || "Failed to sign in.");
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
              className="w-full max-w-md mx-auto p-8 text-left shadow-sm"
            >
              <h2 className="text-2xl font-semibold text-foreground mb-2 text-center">
                Welcome back
              </h2>
              <p className="text-center text-muted-foreground mb-6">
                Log in with Google or email and password.
              </p>

              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 rounded-lg px-4 py-3 font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 bg-white text-slate-900 border border-slate-300 hover:bg-slate-50 dark:bg-white dark:text-slate-900 dark:border-slate-300 dark:hover:bg-slate-50"
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
                Sign in with Google
              </button>

              <div className="my-6 text-sm text-muted-foreground text-center">
                Or log in with email
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-3">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:bg-white dark:text-slate-900 dark:placeholder:text-slate-500"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:bg-white dark:text-slate-900 dark:placeholder:text-slate-500"
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-primary text-primary-foreground px-4 py-2 font-medium hover:bg-primary/90 disabled:opacity-60"
                >
                  {isSubmitting ? "Signing in..." : "Log in"}
                </button>
              </form>

              <Text className="mt-4 text-sm text-muted-foreground text-center">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/signup", { replace: true })}
                  className="text-primary hover:underline"
                >
                  Sign up
                </button>
              </Text>

              <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
                By signing in, you agree to the{" "}
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

export default Login;
