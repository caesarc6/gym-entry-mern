import { useCallback, useRef, useState } from "react";
import IosStandaloneGoogleAuthModal from "../components/IosStandaloneGoogleAuthModal";
import { startGoogleSupabaseOAuth } from "../utils/googleSupabaseOAuth";
import { isIosStandalonePwa } from "../utils/pwaPlatform";

/**
 * Runs Google Supabase OAuth, optionally showing an iOS standalone PWA explainer first.
 */
export function useIosAwareGoogleOAuth() {
  const [iosModalOpen, setIosModalOpen] = useState(false);
  const pendingRef = useRef(null);

  const runOAuth = useCallback(async (payload) => {
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

  const requestGoogleOAuth = useCallback(
    (payload) => {
      if (isIosStandalonePwa()) {
        pendingRef.current = payload;
        setIosModalOpen(true);
        return;
      }
      runOAuth(payload);
    },
    [runOAuth]
  );

  const handleContinue = useCallback(() => {
    const payload = pendingRef.current;
    pendingRef.current = null;
    setIosModalOpen(false);
    if (payload) {
      runOAuth(payload);
    }
  }, [runOAuth]);

  const handleClose = useCallback(() => {
    pendingRef.current = null;
    setIosModalOpen(false);
  }, []);

  const IosGoogleAuthModal = (
    <IosStandaloneGoogleAuthModal
      isOpen={iosModalOpen}
      onClose={handleClose}
      onContinue={handleContinue}
    />
  );

  return { requestGoogleOAuth, IosGoogleAuthModal };
}
