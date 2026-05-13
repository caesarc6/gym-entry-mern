import { useCallback } from "react";
import { startGoogleSupabaseOAuth } from "../utils/googleSupabaseOAuth";

/**
 * Runs Google Supabase OAuth (full-window redirect required for PKCE).
 */
export function useIosAwareGoogleOAuth() {
  const requestGoogleOAuth = useCallback(async (payload) => {
    const { authMode, redirectPath, debugContext, onError } = payload;
    try {
      await startGoogleSupabaseOAuth({
        authMode,
        redirectPath,
        debugContext,
      });
    } catch (error) {
      onError?.(error);
    }
  }, []);

  return { requestGoogleOAuth };
}
