import { useCallback } from "react";
import { startSupabaseOAuth } from "../utils/googleSupabaseOAuth";

/**
 * Runs Supabase OAuth (full-window redirect required for PKCE).
 */
export function useIosAwareGoogleOAuth() {
  const requestProviderOAuth = useCallback(async (provider, payload) => {
    const { authMode, redirectPath, debugContext, onError } = payload;
    try {
      await startSupabaseOAuth({
        provider,
        authMode,
        redirectPath,
        debugContext,
      });
    } catch (error) {
      onError?.(error);
    }
  }, []);

  const requestGoogleOAuth = useCallback(
    (payload) => requestProviderOAuth("google", payload),
    [requestProviderOAuth],
  );

  const requestAppleOAuth = useCallback(
    (payload) => requestProviderOAuth("apple", payload),
    [requestProviderOAuth],
  );

  return { requestGoogleOAuth, requestAppleOAuth };
}
