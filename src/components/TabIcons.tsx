import React from "react";
import Svg, { Path, Rect } from "react-native-svg";

// Tab bar icons — small line-art glyphs in the same single-stroke style
// as the rest of the app's chrome (⋮ ⇄ ⚙ ✕). The previous 📖 / 📚 emojis
// rendered fine but read as "AI default chose an emoji"; bespoke SVG
// glyphs make the tab bar feel deliberately drawn.
//
// Both icons accept the standard react-navigation tab icon shape:
// `{ color, focused, size }`. We use `color` for the stroke and ignore
// the focused flag because the parent already varies tint between
// active/inactive states via tabBarActive/InactiveTintColor.

interface IconProps {
  color: string;
  size?: number;
}

// Open book viewed from a 3/4 angle — two pages converging to a centre
// spine. Reads as "I'm reading right now."
export function StudyTabIcon({ color, size = 26 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M 12 6 C 9 4.5 5 4.5 3 5.5 V 19 C 5 18 9 18 12 19.5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M 12 6 C 15 4.5 19 4.5 21 5.5 V 19 C 19 18 15 18 12 19.5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M 12 6 V 19.5"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
        opacity={0.7}
      />
    </Svg>
  );
}

// Stack of three books seen edge-on — staggered offsets make it read
// as "your collection" rather than just "a list."
export function LibraryTabIcon({ color, size = 26 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={4} y={5} width={16} height={3.6}
        rx={0.5}
        stroke={color}
        strokeWidth={1.5}
      />
      <Rect
        x={6} y={10.2} width={15} height={3.6}
        rx={0.5}
        stroke={color}
        strokeWidth={1.5}
      />
      <Rect
        x={3} y={15.4} width={16} height={3.6}
        rx={0.5}
        stroke={color}
        strokeWidth={1.5}
      />
    </Svg>
  );
}
