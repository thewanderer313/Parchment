// Font tokens.
//
// FONT_SERIF — body copy, list rows, small labels. Georgia is bundled on
// every Android/iOS install so this never blocks the app boot.
//
// FONT_DISPLAY — screen titles and deck names. EB Garamond is a book-y
// humanist serif with real personality at large sizes; the bold weight
// has a presence that "Georgia + fontWeight: 700" simply doesn't. Loaded
// via @expo-google-fonts in the root layout, so use the *_FALLBACK token
// as the cascading fallback so screens render serif (just not as nice)
// during the few milliseconds before the font arrives.
export const FONT_SERIF = "Georgia";

export const FONT_DISPLAY = "EBGaramond_700Bold";
export const FONT_DISPLAY_ITALIC = "EBGaramond_400Regular_Italic";
export const FONT_DISPLAY_REGULAR = "EBGaramond_400Regular";

// FONT_OLDBOOK — IM Fell English, a digital revival of a 17th-century
// English type cut by John Fell. Used only on the Study and Library
// tab landing titles, where the irregularity and antique character
// of the strokes signal "this is an old book" louder than EB Garamond
// does. We keep EB Garamond as the workhorse display face for screen
// titles inside Stack screens, ornament glyphs, and deck names —
// FONT_OLDBOOK is reserved for the two big "front of the book" tabs.
export const FONT_OLDBOOK = "IMFellEnglish_400Regular";
export const FONT_OLDBOOK_ITALIC = "IMFellEnglish_400Regular_Italic";

// The exact strings expected by @expo-google-fonts/eb-garamond's
// useFonts() map. Kept here so font loading and font references share
// one source of truth.
export const DISPLAY_FONT_NAMES = {
  EBGaramond_400Regular: "EBGaramond_400Regular",
  EBGaramond_400Regular_Italic: "EBGaramond_400Regular_Italic",
  EBGaramond_700Bold: "EBGaramond_700Bold",
} as const;
