import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";

import {
  THEME_CHROME_TRANSITION_CLASS,
  THEME_CHROME_TRANSITION_MS,
} from "../constants/themeShellTiming.js";

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

const THEME_MODE_STORAGE_KEY = "themeMode";
const LEGACY_THEME_STORAGE_KEY = "theme";
const THEME_CLASSES = ["light", "dark", "dark-black", "dark-blue"];
const EXPLICIT_THEMES = ["light", "dark", "dark-black", "dark-blue"];
const DEFAULT_THEME_MODE = "system";

const getSystemPrefersDark = () => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return true;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

const normalizeThemeMode = (raw) => {
  if (raw === "system") return "system";
  if (EXPLICIT_THEMES.includes(raw)) return raw;
  return null;
};

const resolveAppliedTheme = (mode) => {
  if (mode === "system") {
    return getSystemPrefersDark() ? "dark" : "light";
  }
  if (EXPLICIT_THEMES.includes(mode)) {
    return mode;
  }
  return resolveAppliedTheme(DEFAULT_THEME_MODE);
};

/** Apply theme classes without ever leaving `html` without light/dark (avoids :root light flash). */
const applyThemeClasses = (root, appliedTheme) => {
  const next = new Set();
  if (appliedTheme === "light") {
    next.add("light");
  } else {
    next.add("dark");
    if (appliedTheme === "dark-black") {
      next.add("dark-black");
    } else if (appliedTheme === "dark-blue") {
      next.add("dark-blue");
    }
  }
  for (const c of THEME_CLASSES) {
    if (next.has(c)) {
      root.classList.add(c);
    } else {
      root.classList.remove(c);
    }
  }
};

/** Avoid flushSync during layout/commit; defer to a microtask (still runs before typical paint). */
const flushCurrentThemeState = (setCurrentThemeImpl, appliedTheme) => {
  queueMicrotask(() => {
    flushSync(() => {
      setCurrentThemeImpl(appliedTheme);
    });
  });
};

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState(() => {
    // Prefer new key; fall back to legacy key.
    const stored =
      localStorage.getItem(THEME_MODE_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    return normalizeThemeMode(stored) || DEFAULT_THEME_MODE;
  });
  const [currentTheme, setCurrentTheme] = useState(() =>
    resolveAppliedTheme(
      normalizeThemeMode(
        localStorage.getItem(THEME_MODE_STORAGE_KEY) ||
          localStorage.getItem(LEGACY_THEME_STORAGE_KEY)
      ) || DEFAULT_THEME_MODE
    )
  );

  /** Last palette actually applied on `document.documentElement` (not the user's mode preference). */
  const lastAppliedResolvedRef = useRef(null);

  const chromeTransitionTimerRef = useRef(null);

  useEffect(
    () => () => {
      if (chromeTransitionTimerRef.current !== null) {
        window.clearTimeout(chromeTransitionTimerRef.current);
      }
    },
    []
  );

  const applyResolvedTheme = useCallback((appliedTheme) => {
    const root = document.documentElement;

    const alreadyApplied =
      lastAppliedResolvedRef.current !== null &&
      lastAppliedResolvedRef.current === appliedTheme;

    if (alreadyApplied) {
      flushCurrentThemeState(setCurrentTheme, appliedTheme);
      root.dataset.themeReady = "true";
      return;
    }

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const prevResolved = lastAppliedResolvedRef.current;
    if (prevResolved !== null && prevResolved !== appliedTheme && !reducedMotion) {
      root.classList.add(THEME_CHROME_TRANSITION_CLASS);
      if (chromeTransitionTimerRef.current !== null) {
        window.clearTimeout(chromeTransitionTimerRef.current);
      }
      chromeTransitionTimerRef.current = window.setTimeout(() => {
        root.classList.remove(THEME_CHROME_TRANSITION_CLASS);
        chromeTransitionTimerRef.current = null;
      }, THEME_CHROME_TRANSITION_MS);
    }

    applyThemeClasses(root, appliedTheme);
    flushCurrentThemeState(setCurrentTheme, appliedTheme);
    lastAppliedResolvedRef.current = appliedTheme;
    root.dataset.themeReady = "true";
  }, []);

  useLayoutEffect(() => {
    try {
      localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
      localStorage.setItem(LEGACY_THEME_STORAGE_KEY, themeMode);
    } catch {
      // Ignore storage errors
    }

    applyResolvedTheme(resolveAppliedTheme(themeMode));
  }, [applyResolvedTheme, themeMode]);

  useEffect(() => {
    if (
      themeMode !== "system" ||
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return undefined;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () =>
      applyResolvedTheme(resolveAppliedTheme("system"));

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handler);
      return () => {
        media.removeEventListener("change", handler);
      };
    }
    media.addListener(handler);
    return () => {
      media.removeListener(handler);
    };
  }, [applyResolvedTheme, themeMode]);

  const setTheme = useCallback((theme) => {
    // Backward compatible: selecting a concrete theme disables system mode.
    setThemeMode(normalizeThemeMode(theme) || "dark");
  }, []);

  const toggleTheme = useCallback(() => {
    const currentExplicit = EXPLICIT_THEMES.includes(themeMode)
      ? themeMode
      : currentTheme;
    const currentIndex = EXPLICIT_THEMES.indexOf(currentExplicit);
    const nextIndex = (currentIndex + 1) % EXPLICIT_THEMES.length;
    setThemeMode(EXPLICIT_THEMES[nextIndex]);
  }, [themeMode, currentTheme]);

  const value = useMemo(
    () => ({
      currentTheme,
      themeMode,
      setTheme,
      setThemeMode,
      toggleTheme,
      isDark: currentTheme !== "light",
    }),
    [currentTheme, themeMode, setTheme, setThemeMode, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
