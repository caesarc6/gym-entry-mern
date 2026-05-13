import React from "react";
import { Icon, Text, Box } from "@chakra-ui/react";
import { IoMoon } from "react-icons/io5";
import { LuSun } from "react-icons/lu";
import { useTheme } from "../contexts/ThemeContext";
import { useThemeColors } from "../hooks/useThemeColors";
import { cn } from "@/lib/utils";

const UI_SHELL_ROW_TEXT =
  "font-sans text-sm font-light leading-snug antialiased";

const ThemeSelector = ({
  onThemeChange,
  className,
  inheritColor = false,
  labelPrefix = "",
  /** When false, layout does not stretch to full width (e.g. top nav toolbar). */
  fullWidth = true,
  /** Show "Dark mode" / "Light mode" text. Defaults to true when `fullWidth`, false otherwise. */
  showLabel = fullWidth,
  /** Use Tailwind/shadcn menu typography (inherits shell font instead of Chakra Text). */
  uiShellTypography = false,
}) => {
  const { currentTheme, setTheme } = useTheme();
  const colors = useThemeColors();

  const togglePalette = () => {
    setTheme(currentTheme === "light" ? "dark-black" : "light");
    if (onThemeChange) {
      onThemeChange();
    }
  };

  const isDark = currentTheme !== "light";
  const CurrentIcon = isDark ? IoMoon : LuSun;

  // Check if we're in a mobile menu (has w-full class) to center, otherwise left-align for desktop menu
  const isMobileMenu = fullWidth && className?.includes("w-full");

  const label = isDark ? "Dark mode" : "Light mode";

  const iconDim = uiShellTypography ? 4 : 5;

  return (
    <Box
      as={showLabel ? "div" : "button"}
      type={showLabel ? undefined : "button"}
      display="flex"
      alignItems="center"
      justifyContent={
        isMobileMenu ? "center" : fullWidth ? "flex-start" : "center"
      }
      gap={showLabel ? 2 : 0}
      onClick={togglePalette}
      cursor="pointer"
      aria-label={
        showLabel ? undefined : isDark ? "Switch to light theme" : "Switch to dark theme"
      }
      title={showLabel ? undefined : label}
      color={
        uiShellTypography
          ? undefined
          : inheritColor
            ? "inherit"
            : colors.textSecondary
      }
      width={fullWidth ? "100%" : "auto"}
      className={cn(uiShellTypography && UI_SHELL_ROW_TEXT, className)}
      w={fullWidth ? "100%" : "auto"}
      borderRadius="md"
      p={showLabel ? 0 : 2}
      lineHeight={uiShellTypography ? undefined : 1}
      bg="transparent"
      border="none"
      _hover={{ opacity: 0.8 }}
    >
      <Icon
        as={CurrentIcon}
        color={
          uiShellTypography
            ? "currentColor"
            : inheritColor
              ? "currentColor"
              : colors.textSecondary
        }
        w={iconDim}
        h={iconDim}
        flexShrink={0}
        aria-hidden
      />
      {showLabel ? (
        uiShellTypography ? (
          <span>
            {labelPrefix}
            {label}
          </span>
        ) : (
          <Text
            as="span"
            fontSize={inheritColor ? "xs" : "sm"}
            fontWeight={inheritColor ? "medium" : "normal"}
            lineHeight={inheritColor ? "1rem" : undefined}
            color={inheritColor ? "inherit" : colors.textSecondary}
          >
            {labelPrefix}
            {label}
          </Text>
        )
      ) : null}
    </Box>
  );
};

export default ThemeSelector;
