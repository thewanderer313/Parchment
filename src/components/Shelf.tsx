import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

interface Props {
  children: React.ReactNode;
  width: number;
}

// A single shelf compartment of a real-feeling bookcase. Layout from
// outside in:
//
//   [LSIDE]  [   back panel               ]  [RSIDE]
//   [     ]  [   books row, bottom-align  ]  [     ]
//   [LSIDE]  [   wooden plank             ]  [RSIDE]
//
// The left and right side panels are continuous wooden bars that span
// the entire Shelf height (compartment + plank). When multiple
// Shelves stack vertically with marginBottom: 0, those bars line up
// across rows to form one tall pair of side rails — the cabinet
// sides. The plank is inset between them, like a real shelf board
// dropped into a cabinet frame.
//
// All wood tones (plank, side panels, lips, shadows) share the same
// per-theme palette so the cabinet reads as a single piece of
// furniture rather than disparate parts.
const COMPARTMENT_MIN_HEIGHT = 150;

// Side rail width. 12 px is heavy enough to read as a structural side
// panel without stealing meaningful book-display space. The Study
// tab compensates by packing books into (shelfWidth - 2 * SIDE_RAIL_WIDTH).
export const SIDE_RAIL_WIDTH = 12;

export function Shelf({ children, width }: Props) {
  const { theme } = useTheme();
  // Wood tone — three-way fork so the cabinet reads palette-consistent
  // in every theme:
  //   light   → warm tan plank, cream lip, sepia shadow (oak-on-paper)
  //   dark    → slate plank, brighter slate lip, near-black shadow
  //   leather → caramel walnut plank, lighter walnut lip, deep warm
  //             shadow (the wood of an aged study)
  const plankColor =
    theme.mode === "light" ? "#b89e6f" :
    theme.mode === "leather" ? "#6a4828" :
    "#3a3a32";
  const plankLip =
    theme.mode === "light" ? "#d7c098" :
    theme.mode === "leather" ? "#8a6238" :
    "#5a5a4a";
  const plankShadow =
    theme.mode === "light" ? "rgba(60, 40, 20, 0.25)" :
    theme.mode === "leather" ? "rgba(15, 5, 0, 0.5)" :
    "rgba(0, 0, 0, 0.4)";
  // Back panel: slightly darker than bgApp so it reads as "behind."
  const backPanelColor =
    theme.mode === "light" ? "#d8cca6" :
    theme.mode === "leather" ? "#2a1810" :
    "#15191a";
  const backTopShadow =
    theme.mode === "light" ? "rgba(50, 30, 12, 0.18)" :
    theme.mode === "leather" ? "rgba(15, 5, 0, 0.5)" :
    "rgba(0, 0, 0, 0.5)";

  const innerWidth = width - 2 * SIDE_RAIL_WIDTH;

  return (
    <View style={[styles.wrap, { width }]}>
      {/* Left side rail — vertical wooden bar, inner edge catches
          light, outer edge in shadow. */}
      <View style={[styles.sideRail, { backgroundColor: plankColor }]}>
        <View style={[styles.sideRailInnerLight, { backgroundColor: plankLip, right: 0 }]} />
        <View style={[styles.sideRailOuterShadow, { backgroundColor: plankShadow, left: 0 }]} />
      </View>

      {/* Centre column: compartment over plank */}
      <View style={[styles.column, { width: innerWidth }]}>
        <View style={[styles.compartment, { width: innerWidth, minHeight: COMPARTMENT_MIN_HEIGHT }]}>
          <View style={[styles.backPanel, { backgroundColor: backPanelColor }]}>
            <View style={[styles.backTopShadow, { backgroundColor: backTopShadow }]} />
          </View>
          <View style={[styles.booksRow, { width: innerWidth }]}>{children}</View>
        </View>
        <View style={[styles.shelfPlank, { backgroundColor: plankColor, width: innerWidth }]}>
          <View style={[styles.shelfLip, { backgroundColor: plankLip }]} />
          <View style={[styles.shelfShadow, { backgroundColor: plankShadow }]} />
        </View>
      </View>

      {/* Right side rail — mirror of the left. Light on the inner
          (left) edge, shadow on the outer (right) edge. */}
      <View style={[styles.sideRail, { backgroundColor: plankColor }]}>
        <View style={[styles.sideRailInnerLight, { backgroundColor: plankLip, left: 0 }]} />
        <View style={[styles.sideRailOuterShadow, { backgroundColor: plankShadow, right: 0 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Flush vertical stacking: marginBottom: 0 so the side rails of
  // adjacent shelves line up into one continuous pair of cabinet
  // sides. The plank inside each shelf provides the visual divider
  // between rows.
  wrap: {
    flexDirection: "row",
    alignSelf: "center",
    marginBottom: 0,
  },
  sideRail: {
    width: SIDE_RAIL_WIDTH,
    alignSelf: "stretch", // matches the column height
    position: "relative",
  },
  // 1 px highlight strip along the inner edge of each side rail (the
  // edge facing the books). Suggests the rail's front face catches
  // light from inside the cabinet compartment.
  sideRailInnerLight: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    opacity: 0.9,
  },
  // 1 px shadow along the outer edge — the rail's back face is in
  // shade.
  sideRailOuterShadow: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    opacity: 0.5,
  },
  column: {
    // width set inline based on outer width - 2 * SIDE_RAIL_WIDTH
  },
  compartment: {
    justifyContent: "flex-end",
  },
  backPanel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  backTopShadow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.7,
  },
  booksRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    gap: 8,
    paddingHorizontal: 4,
  },
  shelfPlank: {
    height: 10,
    marginTop: -1,
    overflow: "hidden",
  },
  shelfLip: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  shelfShadow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
});
