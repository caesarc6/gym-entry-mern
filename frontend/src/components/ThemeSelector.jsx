import React from "react";
import { Button, Icon, Text, useColorMode, Box } from "@chakra-ui/react";
import { IoMoon } from "react-icons/io5";
import { LuSun } from "react-icons/lu";
import { useTheme } from "../contexts/ThemeContext";
import { useThemeColors } from "../hooks/useThemeColors";
import { cn } from "../lib/utils";

const ThemeSelector = ({
  onThemeChange,
  className,
  inheritColor = false,
  labelPrefix = "",
}) => {
  const { currentTheme, setTheme } = useTheme();
  const colors = useThemeColors();
  const { colorMode } = useColorMode();

  const toggleTheme = () => {
    setTheme(currentTheme === "light" ? "dark-black" : "light");
    if (onThemeChange) {
      onThemeChange();
    }
  };

  const isDark = currentTheme === "dark-black";
  const CurrentIcon = isDark ? IoMoon : LuSun;

  // Check if we're in a mobile menu (has w-full class) to center, otherwise left-align for desktop menu
  const isMobileMenu = className?.includes("w-full");

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent={isMobileMenu ? "center" : "flex-start"}
      gap={2}
      onClick={toggleTheme}
      cursor="pointer"
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      color={inheritColor ? "inherit" : colors.textSecondary}
      width="100%"
      className={className}
      w="100%"
      _hover={{ opacity: 0.8 }}
    >
      <Icon
        as={CurrentIcon}
        color={inheritColor ? "currentColor" : colors.textSecondary}
        w={5}
        h={5}
      />
      <Text
        fontSize={inheritColor ? "xs" : "sm"}
        fontWeight={inheritColor ? "medium" : "normal"}
        lineHeight={inheritColor ? "1rem" : undefined}
        color={inheritColor ? "inherit" : colors.textSecondary}
      >
        {labelPrefix}
        {isDark ? "Dark" : "Light"}
      </Text>
    </Box>
  );
};

export default ThemeSelector;
