import { Capacitor } from "@capacitor/core";

export function isCapacitorNative() {
  if (typeof window === "undefined") return false;

  const fromWindow =
    window.Capacitor && typeof window.Capacitor.isNativePlatform === "function"
      ? window.Capacitor.isNativePlatform()
      : null;

  if (typeof fromWindow === "boolean") return fromWindow;

  if (Capacitor && typeof Capacitor.isNativePlatform === "function") {
    return Capacitor.isNativePlatform();
  }

  return false;
}

/** iPhone, iPad, and the Capacitor iOS WKWebView. Desktop Safari stays out. */
export function isIosClient() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) {
    return true;
  }
  try {
    const platform =
      typeof window !== "undefined" && window.Capacitor?.getPlatform?.();
    return platform === "ios";
  } catch {
    return false;
  }
}

export function markIosFormFields() {
  if (typeof document === "undefined" || !isIosClient()) return;
  document.documentElement.classList.add("ios-form");
}

