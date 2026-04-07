import { Container, VStack } from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { supabase } from "../supabase/supabase";
import { useNavigate, useLocation } from "react-router-dom";
import { API_ENDPOINTS, apiClient } from "../config/api";
import { maybeMigrateAccount } from "../utils/migration";
import { useCustomToast } from "../hooks/useCustomToast";
import { setAuthRedirect } from "../utils/auth";
import { useIosAwareGoogleOAuth } from "../hooks/useIosAwareGoogleOAuth";

const SignUpFlow = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useCustomToast();
  const { requestGoogleOAuth, IosGoogleAuthModal } = useIosAwareGoogleOAuth();

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
        toast.success("Success", "Account created successfully.");
        navigate(redirectPath, { replace: true });
      } else {
        toast.success(
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
    {/* <div className="relative w-screen h-screen mx-auto bg-white flex items-center justify-center overflow-hidden"> */}
    <Container
      maxW="container.xl"
      className="text-center"
      py={12}
      style={{
        display: "flex",
        flexDirection: "column",
      }}
    >
      <VStack spacing={8} mt={10}>
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">
            Welcome to Ethereal Gains!
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            Complete your signup with Google. Your username will be
            automatically generated from your name.
          </p>
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 
                     rounded-lg px-4 py-3 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-600 
                     transition-colors duration-200 focus:outline-none focus:ring-2 
                     focus:ring-blue-500 focus:ring-offset-2"
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
          <div className="my-6 text-sm text-gray-500 dark:text-gray-400">
            Or sign up with email
          </div>
          <form onSubmit={handleEmailSignUp} className="space-y-3">
            <input
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? "Creating account..." : "Sign up"}
            </button>
          </form>
        </div>
      </VStack>
    </Container>
    {IosGoogleAuthModal}
    </>
  );
};

export default SignUpFlow;
