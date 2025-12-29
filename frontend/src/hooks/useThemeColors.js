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

    // Theme-aware utility colors
    textPrimary: getThemeColor("gray.900", "gray.100"),
    textSecondary: getThemeColor("gray.600", "gray.400"),
    textMuted: getThemeColor("gray.500", "gray.500"),
    textTitle: getThemeColor("gray.800", "gray.200"),
    textDesc: getThemeColor("gray.700", "gray.400"),
    textOne: getThemeColor("gray.300", "gray.600"),

    // Background utilities
    bgCard: getThemeColor("white", "gray.800"),
    bgHover: getThemeColor("gray.100", "gray.700"),
    bgMuted: getThemeColor("gray.50", "gray.700"),
    bgButton: getThemeColor("gray.100", "gray.600"),

    // Border utilities
    borderColor: getThemeColor("gray.200", "gray.600"),
    borderColorLight: getThemeColor("gray.100", "gray.700"),
    borderColorInput: getThemeColor("gray.300", "gray.500"),

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
    processColor: "blue.500",
    processBg: getThemeColor("blue.50", "blue.900"),

    // Scrollbar colors
    scrollbarThumb: getThemeColor("#CBD5E0", "#4A5568"),
    scrollbarThumbHover: getThemeColor("#A0AEC0", "#718096"),
  };
};
