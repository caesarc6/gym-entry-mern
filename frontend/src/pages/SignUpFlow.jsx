import { useState, useEffect } from "react";
import { supabase } from "../supabase/supabase";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { provisionAccount } from "../utils/provisionAccount";
import { maybeMigrateAccount } from "../utils/migration";
import { useCustomToast } from "../hooks/useCustomToast";
import { setAuthRedirect } from "../utils/auth";
import { useIosAwareGoogleOAuth } from "../hooks/useIosAwareGoogleOAuth";
import AuthScreenLayout from "../components/AuthScreenLayout";
import { Card } from "../components/ui/card";
import {
  AppleSignInMark,
  authFieldClassName,
  oauthButtonClassName,
} from "../components/AppleSignInMark";
import {
  authCardClassName,
  authEyebrowClassName,
  authHeadingClassName,
  authPrimaryButtonClassName,
} from "../lib/authChrome";

const SignUpFlow = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useCustomToast();
  const { requestGoogleOAuth, requestAppleOAuth } = useIosAwareGoogleOAuth();

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
        const response = await provisionAccount();
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
    <AuthScreenLayout>
      <div className="w-full space-y-10 text-center">
        <div className="space-y-3">
          <p className={authEyebrowClassName}>Create account</p>
          <h1 className={authHeadingClassName}>Ethereal Gains</h1>
        </div>

        <Card variant="default" className={authCardClassName}>
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleAppleSignIn}
              className={`${oauthButtonClassName} bg-black text-white border border-black hover:bg-neutral-900`}
            >
              <AppleSignInMark />
              Sign up with Apple
            </button>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className={`${oauthButtonClassName} bg-white text-slate-900 border border-slate-300 hover:bg-slate-50 dark:bg-white dark:text-slate-900 dark:border-slate-300 dark:hover:bg-slate-50`}
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
              Sign up with Google
            </button>
          </div>

          <p className="my-8 text-center text-sm text-muted-foreground">
            or email
          </p>

          <form onSubmit={handleEmailSignUp} className="space-y-4">
            <input
              type="text"
              placeholder="Full name"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={authFieldClassName}
            />
            <input
              type="email"
              placeholder="Email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={authFieldClassName}
              required
            />
            <input
              type="password"
              placeholder="Password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authFieldClassName}
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className={authPrimaryButtonClassName}
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() =>
                navigate("/login", {
                  replace: true,
                  state: { from: redirectPath },
                })
              }
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Log in
            </button>
          </p>
        </Card>

        <p className="max-w-xs text-center text-xs leading-5 text-muted-foreground">
          By continuing you agree to the{" "}
          <Link
            to="/terms-of-service"
            className="font-medium text-foreground/80 hover:underline"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            to="/privacy-policy"
            className="font-medium text-foreground/80 hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </AuthScreenLayout>
  );
};

export default SignUpFlow;
