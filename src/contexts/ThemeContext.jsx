// src/contexts/ThemeContext.jsx
// Manages dark/light mode with three sources of truth (in priority order):
//   1. User's explicit toggle (saved to localStorage)
//   2. System preference (prefers-color-scheme: dark)
//   3. Default: dark (fits the IronLog brand)
//
// HOW IT WORKS:
//   - Adds/removes the class "theme-light" on <html>
//   - CSS in styles.css overrides --bg, --surface, etc. when that class is present
//   - No inline style injection needed

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

/** Reads the initial theme from localStorage, then system preference */
function getInitialTheme() {
  try {
    const stored = localStorage.getItem("ironlog_theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch (_) { /* localStorage blocked */ }

  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  // Apply the class to <html> whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("theme-light");
    } else {
      root.classList.remove("theme-light");
    }
    try {
      localStorage.setItem("ironlog_theme", theme);
    } catch (_) {}
  }, [theme]);

  // Also listen to OS-level changes (user switches system theme)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = (e) => {
      // Only follow OS if the user hasn't explicitly set a preference
      const stored = localStorage.getItem("ironlog_theme");
      if (!stored) setTheme(e.matches ? "light" : "dark");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const isDark = theme === "dark";

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}