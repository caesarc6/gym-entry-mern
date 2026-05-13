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

export const THEME_SHELL_BORDER_TRANSITION =
  `border-color ${THEME_SHELL_DURATION_MS}ms ${THEME_SHELL_EASING} ${THEME_SHELL_DELAY_MS}ms`;

/** Fixed nav strips that set bg inline + border via classes (e.g. HeroHeader). */
export const THEME_SHELL_BG_BORDER_TRANSITION =
  `${THEME_BG_TRANSITION}, ${THEME_SHELL_BORDER_TRANSITION}`;

/**
 * Theme-linked placeholder imagery crossfades via opacity. Uses the same delay + easing as the
 * shell; duration spans delay+duration of {@link THEME_BG_TRANSITION} so the fade reads as slow as
 * the full bg interpolation window (img transitions can lose longhands when `theme-chrome-transition`
 * sets `transition-property` without `opacity` — apply this as inline `transition` on those imgs).
 */
export const THEME_SHELL_ARTWORK_DURATION_MS =
  THEME_SHELL_DURATION_MS + THEME_SHELL_DELAY_MS;
