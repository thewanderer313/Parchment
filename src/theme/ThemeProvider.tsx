import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { lightTheme, darkTheme, type Theme, type ThemeSelection } from "./palette";

interface ThemeContextValue {
  theme: Theme;
  selection: ThemeSelection;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface Props {
  children: React.ReactNode;
  mode: ThemeSelection;
}

export function ThemeProvider({ children, mode }: Props) {
  const systemScheme = useColorScheme();

  const value = useMemo<ThemeContextValue>(() => {
    let resolved: Theme;
    if (mode === "light") resolved = lightTheme;
    else if (mode === "dark") resolved = darkTheme;
    else resolved = systemScheme === "dark" ? darkTheme : lightTheme;
    return { theme: resolved, selection: mode };
  }, [mode, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside a ThemeProvider");
  return ctx;
}
