import React from "react";
import { Button, Icon, Text, useColorMode } from "@chakra-ui/react";
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
    <Button
      size="sm"
      variant="ghost"
      leftIcon={<Icon as={CurrentIcon} />}
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      color={currentTheme === "light" ? "gray.500" : "gray.500"}
      fontWeight="normal"
      fontSize="0.75rem"
      className={cn(
        colorMode === "light"
          ? "text-gray-500 hover:text-gray-500 hover:bg-gray-100"
          : "text-gray-500 hover:text-blue-300 hover:bg-gray-800"
      )}
    >
      {isDark ? "Dark" : "Light"}
    </Button>
  );
};

export default ThemeSelector;
