import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useTheme } from "./ThemeContext.jsx";
import {
  THEME_BG_TRANSITION as CANVAS_BG_TRANSITION,
  THEME_SHELL_DURATION_MS as CANVAS_SHELL_DURATION_MS,
  THEME_SHELL_DELAY_MS as CANVAS_SHELL_DELAY_MS,
  THEME_SHELL_EASING as CANVAS_SHELL_EASING,
} from "../constants/themeShellTiming.js";

const CanvasShellContext = createContext(null);

export const CANVAS_HEX = {
  light: "#ebecef",
  dark: "#070708",
  "dark-black": "#080809",
  "dark-blue": "#050508",
};

export {
  CANVAS_BG_TRANSITION,
  CANVAS_SHELL_DELAY_MS,
  CANVAS_SHELL_DURATION_MS,
  CANVAS_SHELL_EASING,
};

/** `rgba(.., α)` — animates cleanly with the deferred shell `paintHex`. */
export function hexAlpha(hex, alpha) {
  if (!hex.startsWith("#") || !(alpha >= 0 && alpha <= 1)) {
    return hex;
  }
  let h = hex.slice(1);
  if (h.length === 3) {
    h = [...h].map((c) => c + c).join("");
  }
  const num = Number.parseInt(h, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function subscribeReducedMotion(cb) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function snapshotReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function reducedMotionServerSnapshot() {
  return false;
}

export function CanvasShellProvider({ children }) {
  const { currentTheme } = useTheme();

  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    snapshotReducedMotion,
    reducedMotionServerSnapshot
  );

  useLayoutEffect(() => {
    document.documentElement.style.setProperty(
      "--theme-shell-duration",
      `${CANVAS_SHELL_DURATION_MS}ms`
    );
    document.documentElement.style.setProperty(
      "--theme-shell-delay",
      `${CANVAS_SHELL_DELAY_MS}ms`
    );
    document.documentElement.style.setProperty(
      "--theme-shell-ease",
      CANVAS_SHELL_EASING
    );
  }, []);

  const targetHex =
    CANVAS_HEX[currentTheme] ?? CANVAS_HEX.light;

  const [paintHex, setPaintHex] = useState(targetHex);

  useLayoutEffect(() => {
    if (prefersReducedMotion) {
      setPaintHex(targetHex);
      return undefined;
    }
    if (targetHex === paintHex) {
      return undefined;
    }
    const id = window.requestAnimationFrame(() => {
      setPaintHex(targetHex);
    });
    return () => window.cancelAnimationFrame(id);
  }, [paintHex, prefersReducedMotion, targetHex]);

  useLayoutEffect(() => {
    const t = prefersReducedMotion ? "" : CANVAS_BG_TRANSITION;
    const { documentElement: root, body } = document;
    const rootEl = document.getElementById("root");

    root.style.backgroundColor = paintHex;
    root.style.transition = t;
    body.style.backgroundColor = paintHex;
    body.style.transition = t;
    if (rootEl) {
      rootEl.style.backgroundColor = paintHex;
      rootEl.style.transition = t;
    }
    root.style.setProperty("--app-shell-bg", paintHex);
  }, [paintHex, prefersReducedMotion]);

  const value = useMemo(
    () => ({
      paintHex,
      prefersReducedMotion,
      transition: CANVAS_BG_TRANSITION,
    }),
    [paintHex, prefersReducedMotion]
  );

  return (
    <CanvasShellContext.Provider value={value}>
      {children}
    </CanvasShellContext.Provider>
  );
}

export function useCanvasShell() {
  const ctx = useContext(CanvasShellContext);
  if (ctx === null) {
    throw new Error("useCanvasShell must be used within CanvasShellProvider");
  }
  return ctx;
}
