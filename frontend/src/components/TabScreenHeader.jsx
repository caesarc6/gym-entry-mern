import { useLocation, useNavigate } from "react-router-dom";
import { FiPlus, FiSettings } from "react-icons/fi";
import { cn } from "../lib/utils";
import { useTheme } from "../contexts/ThemeContext";
import { isCapacitorNative as getIsCapacitorNative } from "../utils/isNativePlatform";
import { useProductStore } from "../store/product";

function tabMeta(pathname) {
  if (pathname === "/" || pathname === "") {
    return { title: "Ethereal Gains", key: "feed" };
  }
  if (pathname === "/create" || pathname.startsWith("/create/")) {
    return { title: "Log", key: "create" };
  }
  if (pathname === "/analytics" || pathname.startsWith("/analytics/")) {
    return { title: "Progress", key: "analytics" };
  }
  if (pathname === "/profile" || pathname.startsWith("/profile/")) {
    return { title: "Profile", key: "profile" };
  }
  return null;
}

function headerSurfaceClass(currentTheme) {
  if (currentTheme === "light") {
    return "border-zinc-200/80 bg-zinc-50/90 shadow-sm";
  }
  if (currentTheme === "dark-black") {
    return "border-neutral-800/55 bg-neutral-950/88";
  }
  if (currentTheme === "dark-blue") {
    return "border-[rgb(39_39_42_/_6%)] bg-zinc-950/85";
  }
  return "border-[rgb(39_39_42_/_6%)] bg-zinc-950/88";
}

/**
 * Fixed wordmark bar for the four native tabs. Web uses HeroHeader instead.
 * `fixed` (not sticky) so iOS WKWebView still shows it when tabs are keep-alive
 * behind `display: none`.
 */
export default function TabScreenHeader({
  title,
  leading = null,
  trailing = null,
}) {
  const isNative = getIsCapacitorNative();
  const { currentTheme } = useTheme();
  if (!isNative) return null;

  const renderBar = () => (
    <div
      className={cn(
        "w-full border-b px-4 py-[1px] pt-[constant(safe-area-inset-top)] pt-[env(safe-area-inset-top)] backdrop-blur-xl",
        headerSurfaceClass(currentTheme),
      )}
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="relative flex items-center justify-between py-2">
          <div className="flex h-10 w-10 items-center justify-start">
            {leading}
          </div>
          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2">
            <span className="nav-wordmark text-foreground">{title}</span>
          </div>
          <div className="flex h-10 w-10 items-center justify-end">
            {trailing}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <nav className="fixed inset-x-0 top-0 z-20 w-full">{renderBar()}</nav>
      <div aria-hidden className="invisible pointer-events-none">
        {renderBar()}
      </div>
    </>
  );
}

/** One shared iOS top banner for Feed, Log, Progress, and Profile. */
export function NativeTabScreenHeader() {
  const isNative = getIsCapacitorNative();
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = useProductStore((s) => s.currentUser);
  const { currentTheme } = useTheme();
  const meta = tabMeta(location.pathname);

  if (!isNative || !meta) return null;

  const iconBtnClass = cn(
    "inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
    currentTheme === "light"
      ? "text-gray-700 hover:bg-gray-100"
      : "text-zinc-200/90 hover:bg-white/10 hover:text-white",
  );

  const leading =
    meta.key === "feed" ? (
      <button
        type="button"
        onClick={() => navigate("/create")}
        aria-label="Log a workout"
        className={iconBtnClass}
      >
        <FiPlus className="h-5 w-5" />
      </button>
    ) : null;

  const trailing =
    meta.key === "profile" && currentUser ? (
      <button
        type="button"
        onClick={() => navigate("/settings")}
        aria-label="Settings"
        className={iconBtnClass}
      >
        <FiSettings className="h-5 w-5" />
      </button>
    ) : null;

  return (
    <TabScreenHeader
      title={meta.title}
      leading={leading}
      trailing={trailing}
    />
  );
}
