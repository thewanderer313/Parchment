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

// FONT_OLDBOOK — Cinzel Decorative, a contemporary face inspired by
// inscriptional Roman capitals with ornamental flourishes designed
// specifically to evoke illuminated-manuscript title pages. Used only
// on the Study and Library tab landing titles, where the embossed,
// almost-engraved quality reads as "the front cover of a fine old
// book" — the same visual vocabulary as the splash screen wordmark.
// Everywhere else in the chrome (Stack screen titles, ornament
// glyphs, deck names, card editor headings) keeps EB Garamond.
export const FONT_OLDBOOK = "CinzelDecorative_700Bold";
export const FONT_OLDBOOK_REGULAR = "CinzelDecorative_400Regular";

// The exact strings expected by @expo-google-fonts/eb-garamond's
// useFonts() map. Kept here so font loading and font references share
// one source of truth.
export const DISPLAY_FONT_NAMES = {
  EBGaramond_400Regular: "EBGaramond_400Regular",
  EBGaramond_400Regular_Italic: "EBGaramond_400Regular_Italic",
  EBGaramond_700Bold: "EBGaramond_700Bold",
} as const;
