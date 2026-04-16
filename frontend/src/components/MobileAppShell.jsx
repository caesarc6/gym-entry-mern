import BottomTabBar from "./BottomTabBar";

/**
 * Native app shell layout:
 * - leaves room for fixed bottom tabs (incl. safe-area)
 * - lets route content scroll naturally
 */
export default function MobileAppShell({ children }) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <main className="pb-[calc(64px+env(safe-area-inset-bottom))]">{children}</main>
      <BottomTabBar />
    </div>
  );
}

