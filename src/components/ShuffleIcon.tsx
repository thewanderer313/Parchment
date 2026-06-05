import React from "react";
import Svg, { Path } from "react-native-svg";

interface Props {
  on: boolean;
  color: string;
  size?: number;
}

// State-aware shuffle indicator. Two distinct icons (not a colour
// difference on the same glyph) so the active mode is obvious even
// at small sizes or for users whose contrast sensitivity makes
// "muted green vs muted parchment" hard to tell apart.
//
//   on  → the classic media-player shuffle icon: two arrows whose
//          paths cross in the middle, telegraphing "next card is not
//          the one in order."
//   off → a single straight forward arrow, telegraphing "next card
//          is the one in order."
//
// Both drawn in the same single-stroke style as the tab icons and
// other chrome glyphs so the visual voice stays consistent.
export function ShuffleIcon({ on, color, size = 22 }: Props) {
  if (on) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Upper rail: starts top-left, runs right, curves DOWN
            through the middle, ends bottom-right. The cubic curve
            controls (12,7) and (12,17) make the two paths cross
            in the centre rather than dipping shallowly. */}
        <Path
          d="M 3 7 L 9 7 C 12 7 12 17 15 17 L 21 17"
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Arrowhead for the upper rail's end (bottom-right) */}
        <Path
          d="M 18 14 L 21 17 L 18 20"
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Lower rail: starts bottom-left, runs right, curves UP
            through the middle, ends top-right. Mirror of the upper
            rail — together they form the classic crossing-arrows
            shuffle silhouette. */}
        <Path
          d="M 3 17 L 9 17 C 12 17 12 7 15 7 L 21 7"
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Arrowhead for the lower rail's end (top-right) */}
        <Path
          d="M 18 4 L 21 7 L 18 10"
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  // Sequential / in-order — a single right-pointing arrow. Reads as
  // "next card follows in sequence" without any visual ambiguity.
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M 4 12 L 19 12"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Path
        d="M 15 8 L 19 12 L 15 16"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
