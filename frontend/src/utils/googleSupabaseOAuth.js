import { supabase } from "../supabase/supabase";
import { pushAuthDebug, setAuthRedirect } from "./auth";

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
  const redirectTo = `${window.location.origin}/auth/callback`;

  pushAuthDebug(`${debugContext}: starting OAuth`, { redirectTo });
  console.debug(`[${debugContext}] starting OAuth`, { redirectTo });

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
  console.debug(`[${debugContext}] OAuth redirect`, { url: data?.url });

  if (!data?.url) {
    throw new Error("Missing OAuth redirect URL");
  }

  window.location.replace(data.url);
}
