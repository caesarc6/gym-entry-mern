import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import { hexAlpha, useCanvasShell } from "../contexts/CanvasShellContext.jsx";
import { Home, PlusSquare, BarChart3, User } from "lucide-react";

const tabs = [
  { key: "feed", label: "Feed", to: "/", Icon: Home },
  { key: "create", label: "Create", to: "/create", Icon: PlusSquare },
  { key: "analytics", label: "Analytics", to: "/analytics", Icon: BarChart3 },
  { key: "profile", label: "Profile", to: "/profile", Icon: User },
];

function isActivePath(pathname, to) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export default function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { paintHex, prefersReducedMotion, transition } = useCanvasShell();

  const barStyle = prefersReducedMotion
    ? { backgroundColor: hexAlpha(paintHex, 0.9) }
    : { backgroundColor: hexAlpha(paintHex, 0.9), transition };

  return (
    <nav
      role="navigation"
      aria-label="Bottom navigation"
      className={cn(
        "fixed inset-x-0 bottom-0 z-50",
        "border-t border-border backdrop-blur supports-[backdrop-filter]:backdrop-blur",
        "pb-[env(safe-area-inset-bottom)]",
      )}
      style={barStyle}
    >
      <div className="mx-auto flex max-w-3xl items-stretch justify-between px-2">
        {tabs.map(({ key, label, to, Icon }) => {
          const active = isActivePath(location.pathname, to);
          return (
            <button
              key={key}
              type="button"
              onClick={() => navigate(to)}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 px-2 py-2",
                "text-xs font-medium",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" />
              <span className="leading-none">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

