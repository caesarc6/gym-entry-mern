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

