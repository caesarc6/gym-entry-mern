import { supabase } from "../supabase/supabase";
import { pushAuthDebug, setAuthRedirect } from "./auth";
import { Browser } from "@capacitor/browser";

/**
 * Full-window Google OAuth via Supabase (required for PKCE).
 * @param {Object} opts
 * @param {'login'|'signup'} opts.authMode
 * @param {string} opts.redirectPath - in-app path after auth
 * @param {string} [opts.debugContext] - label for debug logs
 */
export async function startGoogleSupabaseOAuth({
  authMode,
  redirectPath,
  debugContext = "OAuth",
}) {
  setAuthRedirect(authMode, redirectPath);
  const isCapacitorNative =
    typeof window !== "undefined" &&
    window.Capacitor &&
    typeof window.Capacitor.isNativePlatform === "function" &&
    window.Capacitor.isNativePlatform();

  // In native builds we must deep-link back into the app; otherwise iOS will
  // complete OAuth in Safari and keep the user in the website.
  const redirectTo = isCapacitorNative
    ? "com.etherealgains.gymentry://auth/callback"
    : `${window.location.origin}/auth/callback`;

  pushAuthDebug(`${debugContext}: starting OAuth`, { redirectTo });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  pushAuthDebug(`${debugContext}: OAuth redirect`, { url: data?.url });

  if (!data?.url) {
    throw new Error("Missing OAuth redirect URL");
  }

  if (isCapacitorNative) {
    await Browser.open({ url: data.url });
    return;
  }

  window.location.replace(data.url);
}
