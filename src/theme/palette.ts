export type ThemeMode = "light" | "dark" | "leather";

export const THEME_SELECTIONS = ["system", "light", "dark", "leather"] as const;
export type ThemeSelection = (typeof THEME_SELECTIONS)[number];

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

// "Leather" — a third theme styled after the deep, warm interior of
// an aged study: rich saddle-brown backgrounds, parchment-cream text,
// brass-gold for the primary accent (echoing gilt book-spine titles).
// Carries its own `mode: "leather"` identifier so components that
// want a leather-specific look (warm walnut shelves, brown cartouche,
// sepia paper grain) can branch on it explicitly. For "is this a
// dark surface?" checks, treat any non-"light" mode the same way —
// `theme.mode !== "light"` is the right gate.
export const leatherTheme: Theme = {
  mode: "leather",
  colors: {
    // Deep saddle brown — the polished oak / leather chair feel.
    bgApp: "#3d2818",
    // A shade lighter so cards / sheets sit visibly above bgApp.
    bgCard: "#4d3220",
    // Warm parchment cream — sits high-contrast on the leather field.
    textPrimary: "#f0e6cf",
    // Slightly muted body text, like aged paper.
    textBody: "#d4c2a0",
    // Brass / aged-metallic for captions and quiet labels.
    textMuted: "#a08648",
    // Burnished gold — the colour of stamped book-spine titles.
    accentPrimary: "#c79a3a",
    // Lighter saddle for hairline borders and dividers, just enough
    // contrast against bgApp to read at hairline weight.
    accentSoft: "#6a4830",
  },
};
