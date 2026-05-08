import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

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
const THEME_TRANSITION_CLASS = "theme-transition";
const THEME_FADE_CLASS = "theme-fade-overlay";
const THEME_TRANSITION_MS = 520;

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

  useEffect(() => {
    let transitionTimer;

    // Save preference to localStorage (keep legacy key in sync for older code paths)
    try {
      localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
      localStorage.setItem(LEGACY_THEME_STORAGE_KEY, themeMode);
    } catch {
      // Ignore storage errors
    }

    const applyThemeClasses = (root, appliedTheme) => {
      // Remove all theme classes
      root.classList.remove(...THEME_CLASSES);

      // Add current theme class
      if (appliedTheme === "light") {
        root.classList.add("light");
      } else {
        root.classList.add("dark");
        if (appliedTheme === "dark-black") {
          root.classList.add("dark-black");
        } else if (appliedTheme === "dark-blue") {
          root.classList.add("dark-blue");
        }
      }
    };

    const apply = (appliedTheme) => {
      // Apply theme to document
      const root = document.documentElement;
      const canAnimate =
        root.dataset.themeReady === "true" &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (canAnimate) {
        window.clearTimeout(transitionTimer);
        const previousBackground =
          window.getComputedStyle(document.body).backgroundColor ||
          window.getComputedStyle(root).backgroundColor;
        root.style.setProperty("--theme-fade-color", previousBackground);
        root.classList.add(THEME_TRANSITION_CLASS);
        root.classList.add(THEME_FADE_CLASS);
      }

      setCurrentTheme(appliedTheme);
      applyThemeClasses(root, appliedTheme);

      root.dataset.themeReady = "true";

      if (canAnimate) {
        transitionTimer = window.setTimeout(() => {
          root.classList.remove(THEME_TRANSITION_CLASS);
          root.classList.remove(THEME_FADE_CLASS);
          root.style.removeProperty("--theme-fade-color");
        }, THEME_TRANSITION_MS);
      }
    };

    apply(resolveAppliedTheme(themeMode));

    if (themeMode !== "system") {
      return () => {
        window.clearTimeout(transitionTimer);
        document.documentElement.classList.remove(THEME_TRANSITION_CLASS);
        document.documentElement.classList.remove(THEME_FADE_CLASS);
        document.documentElement.style.removeProperty("--theme-fade-color");
      };
    }

    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => apply(resolveAppliedTheme("system"));
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handler);
      return () => {
        media.removeEventListener("change", handler);
        window.clearTimeout(transitionTimer);
        document.documentElement.classList.remove(THEME_TRANSITION_CLASS);
        document.documentElement.classList.remove(THEME_FADE_CLASS);
        document.documentElement.style.removeProperty("--theme-fade-color");
      };
    }
    media.addListener(handler);
    return () => {
      media.removeListener(handler);
      window.clearTimeout(transitionTimer);
      document.documentElement.classList.remove(THEME_TRANSITION_CLASS);
      document.documentElement.classList.remove(THEME_FADE_CLASS);
      document.documentElement.style.removeProperty("--theme-fade-color");
    };
  }, [themeMode]);

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
