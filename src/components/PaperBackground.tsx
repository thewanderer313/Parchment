import React, { useMemo } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Rect, Circle } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";

// Subtle "real paper" texture overlay: a soft vignette darkening the
// corners + scattered low-opacity grain dots. Mathematically flat
// background colors read as plastic; even a tiny amount of variation
// reads as paper.
//
// Goals & non-goals:
// - GOAL: tactile depth (the bg should feel like it has a surface).
// - GOAL: zero impact on text contrast (effect is 5–12% opacity).
// - NOT a goal: visible noise pattern. If you can clearly SEE dots,
//   the intensity is too high.
//
// Drawn via react-native-svg so it scales to any screen size, and
// reuses the same generated grain on re-render (memoized on screen
// width × height) — re-randomizing on every render would shimmer.
//
// Render this as the first child of a screen's root View so it sits
// behind the content. pointerEvents="none" makes sure it never eats
// touches.
interface Props {
  /** Override the grain seed so different screens get slightly
   *  different patterns. Default is fine for most uses. */
  seed?: number;
}

// Stable PRNG so the same (seed, width, height) gives the same grain
// every render. We deliberately don't use Math.random() — that would
// make the texture flicker on every layout pass.
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

interface Dot {
  cx: number;
  cy: number;
  r: number;
  o: number;
}

function generateGrain(seed: number, width: number, height: number, count: number): Dot[] {
  const next = lcg(seed);
  const dots: Dot[] = [];
  for (let i = 0; i < count; i++) {
    dots.push({
      cx: next() * width,
      cy: next() * height,
      // Speck radius: mostly tiny (0.4–1.4 px). A few larger ones
      // (up to 2 px) at lower opacity to suggest paper imperfections.
      r: next() < 0.85 ? 0.4 + next() * 1.0 : 1.0 + next() * 1.2,
      o: 0.03 + next() * 0.07,
    });
  }
  return dots;
}

export function PaperBackground({ seed = 0x9e3779 }: Props) {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();

  // Density tuned to feel present at common screen sizes without
  // being expensive on lower-end Android. ~1 speck per ~8000 px²
  // works out to ~50 on a 360×800 phone.
  const dotCount = Math.max(30, Math.min(140, Math.round((width * height) / 8000)));

  const dots = useMemo(
    () => generateGrain(seed, width, height, dotCount),
    [seed, width, height, dotCount]
  );

  // Three-way tint fork:
  //   light   → warm sepia grain + sepia vignette at 14 % (paper)
  //   dark    → black grain + black vignette at 32 % (deep slate)
  //   leather → sepia grain + very-dark-warm-brown vignette at 22 %
  //             so the corners read as room shadows rather than the
  //             flat black that dark uses (which goes muddy on the
  //             warm saddle-brown bgApp).
  const grainColor =
    theme.mode === "light" ? "#3a2a14" :
    theme.mode === "leather" ? "#3a2a14" :
    "#000000";
  const vignetteColor =
    theme.mode === "light" ? "#3a2a14" :
    theme.mode === "leather" ? "#1a0d04" :
    "#000000";
  const vignetteEnd =
    theme.mode === "light" ? 0.14 :
    theme.mode === "leather" ? 0.22 :
    0.32;

  return (
    <Svg
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      width={width}
      height={height}
    >
      <Defs>
        <RadialGradient id="paperVignette" cx="50%" cy="50%" rx="75%" ry="75%">
          <Stop offset="0" stopColor={vignetteColor} stopOpacity="0" />
          <Stop offset="0.55" stopColor={vignetteColor} stopOpacity="0" />
          <Stop offset="1" stopColor={vignetteColor} stopOpacity={String(vignetteEnd)} />
        </RadialGradient>
      </Defs>
      <Rect width={width} height={height} fill="url(#paperVignette)" />
      {dots.map((d, i) => (
        <Circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={grainColor} fillOpacity={d.o} />
      ))}
    </Svg>
  );
}
