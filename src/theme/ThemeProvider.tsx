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
    switch (mode) {
      case "light":
        resolved = lightTheme;
        break;
      case "dark":
        resolved = darkTheme;
        break;
      case "system":
        resolved = systemScheme === "dark" ? darkTheme : lightTheme;
        break;
      default: {
        const _exhaustive: never = mode;
        throw new Error(`Unknown theme mode: ${String(_exhaustive)}`);
      }
    }
    return { theme: resolved, selection: mode };
  }, [mode, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside a ThemeProvider");
  return ctx;
}
