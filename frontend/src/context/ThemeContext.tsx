import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = "recallhub_theme";

function applyThemeToDOM(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {}
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // 1. Check localStorage
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === "light" || saved === "dark") {
          applyThemeToDOM(saved);
          return saved;
        }
      } catch (e) {}
    }
    // 2. Fall back to OS preference
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      applyThemeToDOM("dark");
      return "dark";
    }
    applyThemeToDOM("light");
    return "light";
  });

  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  // Listen to OS preference changes if no manual preference stored
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      try {
        const saved = localStorage.getItem(THEME_KEY);
        if (!saved) {
          const nextTheme = e.matches ? "dark" : "light";
          setThemeState(nextTheme);
          applyThemeToDOM(nextTheme);
        }
      } catch (e) {}
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleTheme = () => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      applyThemeToDOM(next);
      return next;
    });
  };

  const setTheme = (t: Theme) => {
    applyThemeToDOM(t);
    setThemeState(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
