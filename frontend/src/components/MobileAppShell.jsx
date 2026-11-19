import GlassNavbar from "./GlassNavbar";
import { useIsSignedIn } from "../hooks/useIsSignedIn";
import { cn } from "../lib/utils";

/**
 * Native app shell layout:
 * - signed in: room for the floating glass dock (incl. safe-area)
 * - signed out: no dock (Instagram-style guest browsing)
 */
export default function MobileAppShell({ children }) {
  const isSignedIn = useIsSignedIn();

  return (
    <div className="min-h-[100dvh] bg-transparent text-foreground">
      <main
        className={cn(
          "min-h-[100dvh]",
          isSignedIn && "pb-[calc(7.5rem+env(safe-area-inset-bottom))]",
        )}
      >
        {children}
      </main>
      {isSignedIn ? <GlassNavbar alwaysVisible /> : null}
    </div>
  );
}
