import { useEffect, useRef, useState } from "react";
import { LoadingIndicator } from "./loading";

const PULL_TRIGGER_PX = 56;
const PULL_MAX_PX = 88;
const PULL_SLOP_PX = 12;

function scrollTop() {
  return window.scrollY || document.documentElement.scrollTop || 0;
}

/**
 * Window-level pull-to-refresh. Only engages when the page is already at the top.
 */
export default function FeedPullToRefresh({
  onRefresh,
  disabled = false,
  isRefreshing = false,
  children,
}) {
  const [pullPx, setPullPx] = useState(0);
  const pullPxRef = useRef(0);
  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  const disabledRef = useRef(disabled);
  const refreshingRef = useRef(isRefreshing);

  onRefreshRef.current = onRefresh;
  disabledRef.current = disabled;
  refreshingRef.current = isRefreshing;

  useEffect(() => {
    pullPxRef.current = pullPx;
  }, [pullPx]);

  useEffect(() => {
    const onStart = (event) => {
      if (disabledRef.current || refreshingRef.current) return;
      if (scrollTop() > 0) return;
      const touch = event.touches?.[0];
      if (!touch) return;
      startYRef.current = touch.clientY;
      pullingRef.current = false;
    };

    const onMove = (event) => {
      if (disabledRef.current || refreshingRef.current) return;
      const touch = event.touches?.[0];
      if (!touch) return;

      if (scrollTop() > 1) {
        if (pullingRef.current) {
          pullingRef.current = false;
          pullPxRef.current = 0;
          setPullPx(0);
        }
        return;
      }

      const dy = touch.clientY - startYRef.current;
      if (dy <= PULL_SLOP_PX) return;

      pullingRef.current = true;
      if (event.cancelable) event.preventDefault();
      const next = Math.min(PULL_MAX_PX, (dy - PULL_SLOP_PX) * 0.42);
      pullPxRef.current = next;
      setPullPx(next);
    };

    const onEnd = () => {
      if (!pullingRef.current) return;
      const shouldRefresh = pullPxRef.current >= PULL_TRIGGER_PX;
      pullingRef.current = false;
      pullPxRef.current = 0;
      setPullPx(0);
      if (shouldRefresh) {
        onRefreshRef.current?.();
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  const indicatorHeight = isRefreshing ? PULL_TRIGGER_PX : pullPx;
  const showIndicator = indicatorHeight > 8;

  return (
    <>
      <div
        aria-hidden={!showIndicator}
        className="flex items-center justify-center overflow-hidden"
        style={{
          height: indicatorHeight,
          opacity: showIndicator ? 1 : 0,
          transition: pullingRef.current
            ? "none"
            : "height 180ms ease, opacity 180ms ease",
        }}
      >
        {showIndicator ? <LoadingIndicator variant="compact" /> : null}
      </div>
      {children}
    </>
  );
}
