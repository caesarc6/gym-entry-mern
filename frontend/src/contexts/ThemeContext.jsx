import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    // Get saved theme from localStorage or default to 'dark'
    return localStorage.getItem("theme") || "dark";
  });

  useEffect(() => {
    // Save theme preference to localStorage
    localStorage.setItem("theme", currentTheme);

    // Apply theme to document
    const root = document.documentElement;

    // Remove all theme classes
    root.classList.remove("light", "dark", "dark-black", "dark-blue");

    // Add current theme class
    if (currentTheme === "light") {
      root.classList.add("light");
    } else {
      root.classList.add("dark");
      if (currentTheme === "dark-black") {
        root.classList.add("dark-black");
      } else if (currentTheme === "dark-blue") {
        root.classList.add("dark-blue");
      }
    }
  }, [currentTheme]);

  const setTheme = (theme) => {
    setCurrentTheme(theme);
  };

  const toggleTheme = () => {
    const themes = ["light", "dark", "dark-black", "dark-blue"];
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const value = {
    currentTheme,
    setTheme,
    toggleTheme,
    isDark: currentTheme !== "light",
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
