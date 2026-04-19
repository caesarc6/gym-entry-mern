import { useEffect } from "react";
import BottomTabBar from "./BottomTabBar";

const isCapacitorNative =
  typeof window !== "undefined" &&
  window.Capacitor &&
  typeof window.Capacitor.isNativePlatform === "function" &&
  window.Capacitor.isNativePlatform();

/**
 * Native app shell layout:
 * - leaves room for fixed bottom tabs (incl. safe-area)
 * - lets route content scroll naturally
 */
export default function MobileAppShell({ children }) {
  useEffect(() => {
    if (!isCapacitorNative) return;
    void Promise.all([
      import("../pages/CreatePage"),
      import("../pages/AnalyticsPage"),
      import("../pages/ProfilePage"),
      import("../pages/Login"),
    ]).catch(() => {});
  }, []);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <main className="pb-[calc(64px+env(safe-area-inset-bottom))]">{children}</main>
      <BottomTabBar />
    </div>
  );
}

