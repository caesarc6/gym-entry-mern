import { useLocation, useNavigate } from "react-router-dom";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { cn } from "../lib/utils";
import { hexAlpha, useCanvasShell } from "../contexts/CanvasShellContext.jsx";
import { isCapacitorNative as getIsCapacitorNative } from "../utils/isNativePlatform";
import { Home, PlusSquare, BarChart3, User } from "lucide-react";

const isNative = getIsCapacitorNative();

async function nativeTick() {
  if (!isNative) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Web / unsupported — ignore
  }
}

const tabs = [
  { key: "feed", label: "Feed", to: "/", Icon: Home },
  { key: "log", label: "Log", to: "/create", Icon: PlusSquare },
  { key: "analytics", label: "Progress", to: "/analytics", Icon: BarChart3 },
  { key: "profile", label: "Profile", to: "/profile", Icon: User },
];

function isActivePath(pathname, to) {
  if (to === "/") return pathname === "/" || pathname === "";
  return pathname === to || pathname.startsWith(`${to}/`);
}

/**
 * Floating glass bottom dock.
 * A still bar: tap a tab and it opens. Active tab keeps the dot and heavier icon.
 * On Capacitor iOS, uses a light haptic and a transparent WKWebView for blur.
 *
 * @param {{ alwaysVisible?: boolean }} props
 *   alwaysVisible — show on all breakpoints (native shell). Web keeps md:hidden.
 */
export default function GlassNavbar({ alwaysVisible = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { paintHex, prefersReducedMotion, transition } = useCanvasShell();

  const activateTab = (tab) => {
    void nativeTick();
    if (isActivePath(location.pathname, tab.to)) {
      if (tab.to === "/") {
        window.dispatchEvent(new CustomEvent("eg:home-retap"));
      }
      return;
    }
    navigate(tab.to);
  };

  const barStyle = prefersReducedMotion
    ? {
        backgroundColor: hexAlpha(paintHex, 0.45),
        boxShadow: `0 8px 32px ${hexAlpha(paintHex, 0.25)}`,
      }
    : {
        backgroundColor: hexAlpha(paintHex, 0.45),
        boxShadow: `0 8px 32px ${hexAlpha(paintHex, 0.25)}`,
        transition,
      };

  return (
    <nav
      role="navigation"
      aria-label="Glass mobile navigation"
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 flex justify-center",
        !alwaysVisible && "md:hidden",
        "pointer-events-none px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
      )}
    >
      <div
        className={cn(
          "pointer-events-auto relative inline-flex w-fit items-end justify-center gap-2",
          "select-none rounded-[22px] border border-white/25 px-5 py-2.5",
          "bg-white/12 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/8",
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.32)]",
        )}
        style={barStyle}
      >
        {tabs.map((tab) => {
          const { Icon, label } = tab;
          const active = isActivePath(location.pathname, tab.to);
          return (
            <button
              key={tab.key}
              type="button"
              aria-label={label}
              aria-current={active ? "page" : undefined}
              onClick={() => activateTab(tab)}
              className="relative flex w-14 shrink-0 flex-col items-center justify-end focus:outline-none"
            >
              <span className="relative flex h-11 w-11 items-center justify-center">
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute top-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-foreground",
                    active ? "opacity-80" : "opacity-0",
                  )}
                />
                <Icon
                  className={cn(
                    "h-[22px] w-[22px]",
                    active && "drop-shadow-[0_0_8px_rgba(255,255,255,0.35)]",
                  )}
                  strokeWidth={active ? 2.35 : 1.85}
                />
              </span>
              <span
                className={cn(
                  "mt-0.5 max-w-[4.5rem] truncate text-center text-[10px] leading-none tracking-wide",
                  active
                    ? "font-semibold text-foreground"
                    : "font-medium text-muted-foreground",
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
