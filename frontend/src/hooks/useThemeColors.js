import { useTheme } from "../contexts/ThemeContext";

// Custom hook to get theme-aware colors using CSS custom properties
export const useThemeColors = () => {
  const { currentTheme } = useTheme();

  const getThemeColor = (lightColor, darkColor) => {
    // For light theme, return light color
    if (currentTheme === "light") {
      return lightColor;
    }
    // For dark themes, return dark color
    return darkColor;
  };

  const getCSSVariable = (variableName) => {
    return `hsl(var(--${variableName}))`;
  };

  return {
    currentTheme,
    // Background colors
    background: getCSSVariable("background"),
    card: getCSSVariable("card"),
    popover: getCSSVariable("popover"),

    // Text colors
    foreground: getCSSVariable("foreground"),
    cardForeground: getCSSVariable("card-foreground"),
    popoverForeground: getCSSVariable("popover-foreground"),
    mutedForeground: getCSSVariable("muted-foreground"),

    // Interactive colors
    primary: getCSSVariable("primary"),
    primaryForeground: getCSSVariable("primary-foreground"),
    secondary: getCSSVariable("secondary"),
    secondaryForeground: getCSSVariable("secondary-foreground"),
    muted: getCSSVariable("muted"),
    accent: getCSSVariable("accent"),
    accentForeground: getCSSVariable("accent-foreground"),

    // Border and input colors
    border: getCSSVariable("border"),
    input: getCSSVariable("input"),
    ring: getCSSVariable("ring"),

    // Status colors
    destructive: getCSSVariable("destructive"),
    destructiveForeground: getCSSVariable("destructive-foreground"),

    // Workout feed / ProductCard — driven by CSS variables (theme playground + index.css)
    textPrimary: getCSSVariable("workout-text-primary"),
    textSecondary: getCSSVariable("workout-text-muted"),
    textMuted: getCSSVariable("workout-text-muted"),
    textTitle: getCSSVariable("workout-text-primary"),
    textDesc: getCSSVariable("workout-text-muted"),
    textOne: getCSSVariable("workout-text-subtle"),

    bgCard: getCSSVariable("workout-card"),
    bgHover: getCSSVariable("workout-hover"),
    bgMuted: getCSSVariable("workout-muted"),
    bgButton: getThemeColor("gray.100", "gray.600"),

    borderColor: getCSSVariable("workout-border"),
    borderColorLight: getCSSVariable("workout-border-light"),
    borderColorInput: getCSSVariable("workout-border-input"),
    modalOverlay: getCSSVariable("workout-modal-overlay"),
    modalHeaderBg: getCSSVariable("workout-modal-header"),
    modalFooterBg: getCSSVariable("workout-modal-footer"),
    modalDivider: getCSSVariable("workout-modal-divider"),
    modalButtonBg: getCSSVariable("workout-modal-button-bg"),
    modalButtonText: getCSSVariable("workout-modal-button-text"),
    modalButtonBorder: getCSSVariable("workout-modal-button-border"),

    // Interactive states
    likeActive: "red.500",
    likeBg: getThemeColor("red.50", "red.900"),
    likeBgHover: getThemeColor("red.100", "red.800"),

    // Action colors
    editColor: "green.500",
    editBg: getThemeColor("green.50", "green.900"),
    shareColor: "green.500",
    shareBg: getThemeColor("green.50", "green.900"),
    deleteColor: "red.500",
    deleteBg: getThemeColor("red.50", "red.900"),
    processColor: "blue.400",
    processBg: getThemeColor("blue.50", "blue.900"),

    // Scrollbar colors (workout modals + scroll containers)
    scrollbarThumb: getCSSVariable("workout-scrollbar-thumb"),
    scrollbarThumbHover: getCSSVariable("workout-scrollbar-thumb-hover"),
  };
};
