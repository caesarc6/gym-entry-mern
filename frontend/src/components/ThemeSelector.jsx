import React from "react";
import { Button, Icon, Text, useColorMode, Box } from "@chakra-ui/react";
import { IoMoon } from "react-icons/io5";
import { LuSun } from "react-icons/lu";
import { useTheme } from "../contexts/ThemeContext";
import { useThemeColors } from "../hooks/useThemeColors";
import { cn } from "../lib/utils";

const ThemeSelector = ({ onThemeChange, className }) => {
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

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      gap={2}
      onClick={toggleTheme}
      cursor="pointer"
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      color={colors.textSecondary}
      width={className?.includes("w-full") ? "100%" : "auto"}
      className={className}
    >
      <Icon as={CurrentIcon} color={colors.textSecondary} w={5} h={5} />
      <Text fontSize="sm" color={colors.textSecondary}>
        {isDark ? "Dark" : "Light"}
      </Text>
    </Box>
  );
};

export default ThemeSelector;
