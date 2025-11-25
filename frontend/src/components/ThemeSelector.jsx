import React from "react";
import { Button, Icon, Text, useColorMode, Box } from "@chakra-ui/react";
import { IoMoon } from "react-icons/io5";
import { LuSun } from "react-icons/lu";
import { useTheme } from "../contexts/ThemeContext";
import { useThemeColors } from "../hooks/useThemeColors";
import { cn } from "../lib/utils";

const ThemeSelector = ({ onThemeChange }) => {
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
      gap={2}
      w="full"
      onClick={toggleTheme}
      cursor="pointer"
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      style={{ justifyContent: "center" }}
      color={colors.textSecondary}
    >
      <Icon as={CurrentIcon} color={colors.textSecondary} />
      <Text fontSize="sm" color={colors.textSecondary}>
        {isDark ? "Dark" : "Light"}
      </Text>
    </Box>
  );
};

export default ThemeSelector;
