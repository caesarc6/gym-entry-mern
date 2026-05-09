/**
 * Shared theme shell timing: CSS vars, canvas bg tween, and html.theme-chrome-transition.
 * ThemeContext adds the chrome class before palette classes flip; CanvasShell shares the numbers.
 */

export const THEME_CHROME_TRANSITION_CLASS = "theme-chrome-transition";

export const THEME_SHELL_EASING = "cubic-bezier(0.42, 0, 0.58, 1)";
export const THEME_SHELL_DURATION_MS = 1000;
export const THEME_SHELL_DELAY_MS = 700;

/** How long html.theme-chrome-transition stays: delay + duration + buffer. */
export const THEME_CHROME_TRANSITION_MS =
  THEME_SHELL_DURATION_MS + THEME_SHELL_DELAY_MS + 120;

export const THEME_BG_TRANSITION =
  `background-color ${THEME_SHELL_DURATION_MS}ms ${THEME_SHELL_EASING} ${THEME_SHELL_DELAY_MS}ms`;
