import React from "react";
import Svg, { Path } from "react-native-svg";

// Hand-styled SVG illustrations for empty states. The visual voice is
// "line drawing on the title page of an old book" — single-stroke
// line art, no fills, slightly imperfect curves, soft rounded line
// caps. Color is passed in by the caller (almost always
// theme.colors.textMuted) so the drawing tints with the rest of the
// chrome.
//
// Each illustration ships at a default size of 140 px wide × 110 px
// tall (viewBox 140×120 with the bottom trimmed) — large enough to be
// the focal element of an empty screen but not so large it dominates
// the headline + copy underneath.

interface IllustrationProps {
  color: string;
  size?: number;
}

// Open book viewed from above with a soft perspective — left and
// right pages spread, a thin centre spine, a small bookmark ribbon
// peeking from the bottom of the spine. Reads as "ready to read."
// Used on the Study tab empty state.
export function OpenBookIllustration({ color, size = 140 }: IllustrationProps) {
  return (
    <Svg width={size} height={size * 0.78} viewBox="0 0 140 110" fill="none">
      {/* Left page top edge */}
      <Path
        d="M 70 18 C 60 15 36 14 14 19"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Left page outline */}
      <Path
        d="M 14 19 L 14 86 C 36 84 60 86 70 90"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right page top edge */}
      <Path
        d="M 70 18 C 80 15 104 14 126 19"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right page outline */}
      <Path
        d="M 126 19 L 126 86 C 104 84 80 86 70 90"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Centre spine */}
      <Path
        d="M 70 18 L 70 90"
        stroke={color}
        strokeWidth={1.1}
        opacity={0.55}
        strokeLinecap="round"
      />
      {/* Faint suggestion of text on each page */}
      <Path d="M 22 32 L 60 30" stroke={color} strokeWidth={0.7} opacity={0.35} strokeLinecap="round" />
      <Path d="M 22 42 L 56 40" stroke={color} strokeWidth={0.7} opacity={0.35} strokeLinecap="round" />
      <Path d="M 22 52 L 60 50" stroke={color} strokeWidth={0.7} opacity={0.35} strokeLinecap="round" />
      <Path d="M 80 30 L 118 32" stroke={color} strokeWidth={0.7} opacity={0.35} strokeLinecap="round" />
      <Path d="M 84 40 L 118 42" stroke={color} strokeWidth={0.7} opacity={0.35} strokeLinecap="round" />
      <Path d="M 80 50 L 118 52" stroke={color} strokeWidth={0.7} opacity={0.35} strokeLinecap="round" />
      {/* Bookmark ribbon hanging from the spine — a narrow strip with
          a notched tail. The ribbon picks up the same line tone but
          could be tinted differently by passing a deeper color in a
          future iteration. */}
      <Path
        d="M 66 88 L 66 105 L 70 100 L 74 105 L 74 88"
        stroke={color}
        strokeWidth={1.3}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
    </Svg>
  );
}

// Three books stacked, the top one open, the bottom two closed and
// laid flat. Slight angle on the middle book for visual rhythm. Used
// on the Library tab empty state to suggest "your collection — soon
// to be filled."
export function BookStackIllustration({ color, size = 140 }: IllustrationProps) {
  return (
    <Svg width={size} height={size * 0.78} viewBox="0 0 140 110" fill="none">
      {/* Bottom book — flat horizontal volume */}
      <Path
        d="M 16 92 L 124 92 L 124 102 L 16 102 Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M 16 97 L 124 97"
        stroke={color}
        strokeWidth={0.7}
        opacity={0.4}
        strokeLinecap="round"
      />

      {/* Middle book — slightly inset, slight tilt for visual variety */}
      <Path
        d="M 26 76 L 116 74 L 118 90 L 28 92 Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M 26 81 L 117 79"
        stroke={color}
        strokeWidth={0.7}
        opacity={0.4}
        strokeLinecap="round"
      />

      {/* Top book — open, perspective view from above */}
      <Path
        d="M 38 28 L 70 22 L 102 28 L 102 64 L 70 58 L 38 64 Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Spine of the open book */}
      <Path
        d="M 70 22 L 70 58"
        stroke={color}
        strokeWidth={1.1}
        opacity={0.55}
        strokeLinecap="round"
      />
      {/* Faint text suggestion on the open pages */}
      <Path d="M 45 36 L 65 35" stroke={color} strokeWidth={0.7} opacity={0.35} strokeLinecap="round" />
      <Path d="M 45 44 L 63 43" stroke={color} strokeWidth={0.7} opacity={0.35} strokeLinecap="round" />
      <Path d="M 75 35 L 95 36" stroke={color} strokeWidth={0.7} opacity={0.35} strokeLinecap="round" />
      <Path d="M 75 43 L 95 44" stroke={color} strokeWidth={0.7} opacity={0.35} strokeLinecap="round" />
    </Svg>
  );
}

// A parchment leaf with a quill resting diagonally across it, a small
// ink dot suggesting the quill just lifted from the page. Reads as
// "a fresh page, ready to be written." Used on the Deck Detail empty
// state and a natural fit for any "compose a new card" empty.
export function QuillOnPageIllustration({ color, size = 140 }: IllustrationProps) {
  return (
    <Svg width={size} height={size * 0.78} viewBox="0 0 140 110" fill="none">
      {/* Parchment leaf — slightly trapezoidal for that hand-cut feel */}
      <Path
        d="M 22 18 L 96 16 L 100 22 L 96 28 L 100 100 L 24 102 Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right-edge fold flap — the small notch at the top-right */}
      <Path
        d="M 96 16 L 96 28"
        stroke={color}
        strokeWidth={1.0}
        opacity={0.6}
        strokeLinecap="round"
      />
      {/* Faint text lines */}
      <Path d="M 34 42 L 84 41" stroke={color} strokeWidth={0.8} opacity={0.4} strokeLinecap="round" />
      <Path d="M 34 52 L 88 51" stroke={color} strokeWidth={0.8} opacity={0.4} strokeLinecap="round" />
      <Path d="M 34 62 L 74 61" stroke={color} strokeWidth={0.8} opacity={0.4} strokeLinecap="round" />

      {/* Quill shaft — diagonal across the page, nib at lower-left,
          feather at upper-right. */}
      <Path
        d="M 56 82 L 122 22"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {/* Quill nib triangle — small dark mark where it meets the page */}
      <Path
        d="M 53 84 L 58 86 L 58 80 Z"
        stroke={color}
        strokeWidth={1.0}
        fill={color}
      />
      {/* Feather barbs — five short diagonal strokes along the
          upper portion of the quill, evenly spaced */}
      <Path d="M 95 49 L 106 38" stroke={color} strokeWidth={1.0} strokeLinecap="round" />
      <Path d="M 100 54 L 111 43" stroke={color} strokeWidth={1.0} strokeLinecap="round" />
      <Path d="M 105 59 L 116 48" stroke={color} strokeWidth={1.0} strokeLinecap="round" />
      <Path d="M 110 64 L 121 53" stroke={color} strokeWidth={1.0} strokeLinecap="round" />
      <Path d="M 90 44 L 101 33" stroke={color} strokeWidth={1.0} strokeLinecap="round" />

      {/* A small ink stroke just under the nib — suggests the quill
          just lifted, leaving a small mark on the page */}
      <Path
        d="M 50 88 L 46 92"
        stroke={color}
        strokeWidth={1.1}
        opacity={0.7}
        strokeLinecap="round"
      />
    </Svg>
  );
}
