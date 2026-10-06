import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabase/supabase";
import { provisionAccount } from "../utils/provisionAccount";
import { maybeMigrateAccount } from "../utils/migration";
import { useCustomToast } from "../hooks/useCustomToast";
import { useIosAwareGoogleOAuth } from "../hooks/useIosAwareGoogleOAuth";
import { Card } from "../components/ui/card";
import {
  AppleSignInMark,
  authFieldClassName,
  oauthButtonClassName,
} from "../components/AppleSignInMark";
import { isCapacitorNative as getIsCapacitorNative } from "../utils/isNativePlatform";
import { cn } from "../lib/utils";

const isNative = getIsCapacitorNative();

const Login = () => {
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

  const oauthError = (error) => {
    toast.error("Error", error.message || "Failed to sign in.");
  };

  const handleGoogleLogin = () => {
    requestGoogleOAuth({
      authMode: "login",
      redirectPath,
      debugContext: "Login",
      onError: oauthError,
    });
  };

  const handleAppleLogin = () => {
    requestAppleOAuth({
      authMode: "login",
      redirectPath,
      debugContext: "Login",
      onError: oauthError,
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

      const response = await provisionAccount();
      await maybeMigrateAccount(response?.data?.data);
      navigate(redirectPath, { replace: true });
    } catch (error) {
      toast.error("Error", error.message || "Failed to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        "mx-auto flex w-full min-w-0 max-w-md flex-col justify-center px-5",
        "min-h-[calc(100dvh-7.5rem-env(safe-area-inset-bottom,0px))]",
        isNative
          ? "py-6"
          : "pb-16 pt-[calc(5.5rem+env(safe-area-inset-top))] md:min-h-[100dvh] md:pt-28",
      )}
    >
      <div className="space-y-8 text-center text-sm">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Sign in
          </p>
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Log in with Apple, Google, or email and password.
          </p>
        </div>

        <Card
          variant="mixed"
          className="border-border/80 bg-card/95 p-6 text-left shadow-md backdrop-blur-sm supports-[backdrop-filter]:bg-card/80 sm:p-8"
        >
          <button
            type="button"
            onClick={handleAppleLogin}
            className={`${oauthButtonClassName} bg-black text-white border border-black hover:bg-neutral-900`}
          >
            <AppleSignInMark />
            Sign in with Apple
          </button>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className={`${oauthButtonClassName} mt-3 bg-white text-slate-900 border border-slate-300 hover:bg-slate-50 dark:bg-white dark:text-slate-900 dark:border-slate-300 dark:hover:bg-slate-50`}
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

          <p className="my-6 text-center text-sm leading-relaxed text-muted-foreground">
            Or log in with email
          </p>

          <form onSubmit={handleEmailLogin} className="space-y-3">
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authFieldClassName}
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:scale-[0.99] disabled:opacity-60"
            >
              {isSubmitting ? "Signing in..." : "Log in"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/signup", { replace: true })}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign up
            </button>
          </p>

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
      </div>
    </div>
  );
};

export default Login;
