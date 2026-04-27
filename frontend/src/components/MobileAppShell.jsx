import { useEffect } from "react";
import BottomTabBar from "./BottomTabBar";
import { isCapacitorNative as getIsCapacitorNative } from "../utils/isNativePlatform";
import { useProductStore } from "../store/product";

const isCapacitorNative = getIsCapacitorNative();

/**
 * Native app shell layout:
 * - leaves room for fixed bottom tabs (incl. safe-area)
 * - lets route content scroll naturally
 */
export default function MobileAppShell({ children }) {
  const currentUser = useProductStore((s) => s.currentUser);

  useEffect(() => {
    if (!isCapacitorNative) return;

    const preload = () => {
      if (!currentUser) {
        void import("../pages/Login").catch(() => {});
        return;
      }

      void Promise.all([
        import("../pages/CreatePage"),
        import("../pages/AnalyticsPage"),
        import("../pages/ProfilePage"),
        import("../pages/Login"),
      ]).catch(() => {});
    };

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(preload, { timeout: 1500 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(preload, currentUser ? 500 : 1200);
    return () => window.clearTimeout(timeoutId);
  }, [currentUser]);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <main className="pb-[calc(64px+env(safe-area-inset-bottom))]">{children}</main>
      <BottomTabBar />
    </div>
  );
}

