export type ThemeMode = "light" | "dark";
export type ThemeSelection = "system" | "light" | "dark";

export interface ThemeColors {
  bgApp: string;
  bgCard: string;
  textPrimary: string;
  textBody: string;
  textMuted: string;
  accentPrimary: string;
  accentSoft: string;
}

export interface Theme {
  mode: ThemeMode;
  colors: ThemeColors;
}

export const lightTheme: Theme = {
  mode: "light",
  colors: {
    bgApp: "#e8dec5",
    bgCard: "#f5ecd4",
    textPrimary: "#1f3024",
    textBody: "#2a3b2e",
    textMuted: "#4a6b48",
    accentPrimary: "#2f4a35",
    accentSoft: "#c9bf9f",
  },
};

export const darkTheme: Theme = {
  mode: "dark",
  colors: {
    bgApp: "#1a1f1b",
    bgCard: "#252b26",
    textPrimary: "#f0e6cf",
    textBody: "#d8cfb8",
    textMuted: "#8aa37e",
    accentPrimary: "#7fb087",
    accentSoft: "#3a4438",
  },
};
