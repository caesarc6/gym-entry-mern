import GlassNavbar from "./GlassNavbar";

/**
 * Native app shell layout:
 * - leaves room for the floating glass dock (incl. safe-area)
 * - lets route content scroll naturally under the translucent bar
 */
export default function MobileAppShell({ children }) {
  return (
    <div className="min-h-[100dvh] bg-transparent text-foreground">
      <main className="min-h-[100dvh] pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <GlassNavbar alwaysVisible />
    </div>
  );
}
