/**
 * Detect iOS Safari "Add to Home Screen" standalone mode.
 * External OAuth (e.g. Google) is often shown in a separate Safari-style sheet;
 * that is controlled by the OS, not the app.
 */
export function isIosStandalonePwa() {
  if (typeof window === "undefined") return false;

  const ua = window.navigator.userAgent || "";
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (window.navigator.platform === "MacIntel" &&
      window.navigator.maxTouchPoints > 1);

  if (!isIos) return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches === true ||
    window.navigator.standalone === true
  );
}
