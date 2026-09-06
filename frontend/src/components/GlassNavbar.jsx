import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { cn } from "../lib/utils";
import { hexAlpha, useCanvasShell } from "../contexts/CanvasShellContext.jsx";
import { isCapacitorNative as getIsCapacitorNative } from "../utils/isNativePlatform";
import { Home, PlusSquare, BarChart3, User } from "lucide-react";

const isNative = getIsCapacitorNative();

async function nativeTick(style = ImpactStyle.Light) {
  if (!isNative) return;
  try {
    await Haptics.impact({ style });
  } catch {
    // Web / unsupported — ignore
  }
}

const tabs = [
  { key: "feed", label: "Feed", to: "/", Icon: Home },
  { key: "create", label: "Create", to: "/create", Icon: PlusSquare },
  { key: "analytics", label: "Analytics", to: "/analytics", Icon: BarChart3 },
  { key: "profile", label: "Profile", to: "/profile", Icon: User },
];

const HOLD_MS = 160;
const MOVE_THRESHOLD_PX = 8;
const ICON_SIZE = 44;
const MAX_SCALE = 1.55;
const MAGNETIC_DISTANCE = 120;
const SPRING = { damping: 20, stiffness: 300, mass: 0.5 };

function isActivePath(pathname, to) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

function DockItem({
  tab,
  mouseX,
  active,
  focused,
  magnifying,
  prefersReducedMotion,
}) {
  const ref = useRef(null);
  const { Icon, label } = tab;

  const distance = useTransform(mouseX, (val) => {
    const el = ref.current;
    if (!el || !Number.isFinite(val)) return MAGNETIC_DISTANCE + 1;
    const rect = el.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    return val - center;
  });

  const rawScale = useTransform(
    distance,
    [-MAGNETIC_DISTANCE, 0, MAGNETIC_DISTANCE],
    [1, MAX_SCALE, 1],
  );
  const smoothScale = useSpring(rawScale, SPRING);
  const size = useTransform(smoothScale, (s) => s * ICON_SIZE);
  // Keep lift modest so the top indicator stays inside the dock glass.
  const y = useTransform(smoothScale, (s) => (s - 1) * -6);
  const smoothY = useSpring(y, SPRING);

  const labelClass = cn(
    "mt-0.5 max-w-[4.5rem] truncate text-center text-[10px] leading-none tracking-wide",
    focused || active ? "font-semibold text-foreground" : "font-medium text-muted-foreground",
  );

  const showIndicator = magnifying ? focused : active;

  if (prefersReducedMotion) {
    const bump = magnifying && focused ? 1.35 : 1;
    return (
      <button
        type="button"
        tabIndex={-1}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className="relative flex shrink-0 flex-col items-center justify-end focus:outline-none"
      >
        <div
          ref={ref}
          className="relative flex items-center justify-center"
          style={{
            width: ICON_SIZE * bump,
            height: ICON_SIZE * bump,
          }}
        >
          <TopIndicator visible={showIndicator} />
          <ItemFace Icon={Icon} focused={focused} active={active} />
        </div>
        <span className={labelClass}>{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className="relative flex shrink-0 flex-col items-center justify-end focus:outline-none"
    >
      <motion.div
        ref={ref}
        className="relative flex origin-bottom items-center justify-center"
        style={{
          width: size,
          height: size,
          y: smoothY,
        }}
      >
        <TopIndicator visible={showIndicator} />
        <ItemFace Icon={Icon} focused={focused} active={active} />
      </motion.div>
      <span className={labelClass}>{label}</span>
    </button>
  );
}

function TopIndicator({ visible }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute top-1 left-1/2 z-[1] h-1 w-1 -translate-x-1/2 rounded-full bg-foreground transition-opacity duration-150",
        visible ? "opacity-80" : "opacity-0",
      )}
    />
  );
}

function ItemFace({ Icon, focused, active }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <Icon
        className={cn(
          "h-[55%] w-[55%]",
          (focused || active) &&
            "drop-shadow-[0_0_8px_rgba(255,255,255,0.35)]",
        )}
        strokeWidth={focused || active ? 2.35 : 1.85}
      />
    </div>
  );
}

function isHoverPointer(event) {
  return event.pointerType === "mouse" || event.pointerType === "pen";
}

/**
 * Floating glass bottom dock.
 * Magnetic size on hover (mouse) and hold/drag (touch); release/click to navigate.
 * On Capacitor iOS, uses UIKit-backed Haptics and a transparent WKWebView for blur.
 *
 * @param {{ alwaysVisible?: boolean }} props
 *   alwaysVisible — show on all breakpoints (native shell). Web keeps md:hidden.
 */
export default function GlassNavbar({ alwaysVisible = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { paintHex, prefersReducedMotion, transition } = useCanvasShell();

  const mouseX = useMotionValue(Infinity);
  const holdTimerRef = useRef(null);
  const pointerIdRef = useRef(null);
  const startPointRef = useRef({ x: 0, y: 0 });
  const suppressClickRef = useRef(false);
  const scrubbingRef = useRef(false);
  const hoveredRef = useRef(false);
  const hoverIndexRef = useRef(null);
  const itemRefs = useRef([]);

  const [scrubbing, setScrubbing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(null);

  const expanded = scrubbing || hovered;

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current != null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const indexFromClientX = useCallback((clientX) => {
    const nodes = itemRefs.current;
    if (!nodes.length) return 0;

    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const dist = Math.abs(clientX - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  }, []);

  const syncHover = useCallback(
    (clientX, { vibrate = false } = {}) => {
      mouseX.set(clientX);
      const next = indexFromClientX(clientX);
      if (next !== hoverIndexRef.current) {
        hoverIndexRef.current = next;
        setHoverIndex(next);
        if (vibrate) {
          if (isNative) {
            void nativeTick(ImpactStyle.Light);
          } else if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(6);
          }
        }
      } else if (hoverIndexRef.current == null) {
        hoverIndexRef.current = next;
        setHoverIndex(next);
      }
    },
    [indexFromClientX, mouseX],
  );

  const enterScrub = useCallback(
    (clientX) => {
      suppressClickRef.current = true;
      scrubbingRef.current = true;
      setScrubbing(true);
      syncHover(clientX, { vibrate: false });
      if (isNative) {
        void nativeTick(ImpactStyle.Medium);
      } else if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(10);
      }
    },
    [syncHover],
  );

  const clearMagnify = useCallback(() => {
    hoveredRef.current = false;
    hoverIndexRef.current = null;
    setHovered(false);
    setHoverIndex(null);
    mouseX.set(Infinity);
  }, [mouseX]);

  const endInteraction = useCallback(
    (shouldNavigate, event) => {
      clearHoldTimer();
      const index = hoverIndexRef.current;
      const wasScrubbing = scrubbingRef.current;

      if (shouldNavigate && wasScrubbing && index != null) {
        const tab = tabs[index];
        if (tab) {
          void nativeTick(ImpactStyle.Light);
          navigate(tab.to);
        }
      }

      pointerIdRef.current = null;
      scrubbingRef.current = false;
      setScrubbing(false);

      // Keep magnetic hover if a mouse/pen is still over the dock.
      if (event && isHoverPointer(event) && hoveredRef.current) {
        syncHover(event.clientX, { vibrate: false });
        setHovered(true);
      } else if (!hoveredRef.current) {
        clearMagnify();
      }

      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    },
    [clearHoldTimer, clearMagnify, navigate, syncHover],
  );

  const onPointerDown = (event) => {
    if (event.button != null && event.button !== 0) return;

    pointerIdRef.current = event.pointerId;
    startPointRef.current = { x: event.clientX, y: event.clientY };
    suppressClickRef.current = false;
    clearHoldTimer();

    // Mouse already magnifies on hover; touch/pen wait for hold or drag.
    if (isHoverPointer(event)) {
      syncHover(event.clientX, { vibrate: false });
    }

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // ignore
    }

    const startX = event.clientX;
    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = null;
      if (pointerIdRef.current == null) return;
      enterScrub(startX);
    }, HOLD_MS);
  };

  const onPointerMove = (event) => {
    // Active press / scrub gesture
    if (pointerIdRef.current === event.pointerId) {
      const dx = event.clientX - startPointRef.current.x;
      const dy = event.clientY - startPointRef.current.y;
      const moved = Math.hypot(dx, dy) > MOVE_THRESHOLD_PX;

      if (!scrubbingRef.current && moved) {
        clearHoldTimer();
        enterScrub(event.clientX);
        return;
      }

      if (scrubbingRef.current) {
        event.preventDefault();
        syncHover(event.clientX, { vibrate: true });
      } else if (isHoverPointer(event)) {
        syncHover(event.clientX, { vibrate: false });
      }
      return;
    }

    // Idle mouse/pen hover (no button down)
    if (isHoverPointer(event)) {
      if (!hoveredRef.current) {
        hoveredRef.current = true;
        setHovered(true);
      }
      syncHover(event.clientX, { vibrate: false });
    }
  };

  const onPointerEnter = (event) => {
    if (!isHoverPointer(event) || pointerIdRef.current != null) return;
    hoveredRef.current = true;
    setHovered(true);
    syncHover(event.clientX, { vibrate: false });
  };

  const onPointerLeave = () => {
    if (pointerIdRef.current != null) return;
    clearMagnify();
  };

  const onPointerUp = (event) => {
    if (pointerIdRef.current !== event.pointerId) return;
    if (isHoverPointer(event)) hoveredRef.current = true;
    endInteraction(true, event);
  };

  const onPointerCancel = (event) => {
    if (pointerIdRef.current !== event.pointerId) return;
    hoveredRef.current = false;
    endInteraction(false, event);
  };

  const onClick = (event) => {
    if (suppressClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const index = indexFromClientX(event.clientX);
    const tab = tabs[index];
    if (tab) {
      void nativeTick(ImpactStyle.Light);
      navigate(tab.to);
    }
  };

  useEffect(() => () => clearHoldTimer(), [clearHoldTimer]);

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
          "touch-none select-none rounded-3xl border border-white/20 px-5",
          "bg-white/10 backdrop-blur-xl supports-[backdrop-filter]:bg-white/5",
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)]",
          expanded ? "pb-2 pt-3" : "py-2.5",
        )}
        style={barStyle}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClick={onClick}
      >
        {tabs.map((tab, index) => {
          const active = isActivePath(location.pathname, tab.to);
          const focused = expanded && hoverIndex === index;
          return (
            <div
              key={tab.key}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              className="flex items-end"
            >
              <DockItem
                tab={tab}
                mouseX={mouseX}
                active={active}
                focused={focused}
                magnifying={expanded}
                prefersReducedMotion={prefersReducedMotion}
              />
            </div>
          );
        })}
      </div>
    </nav>
  );
}
