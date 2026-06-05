import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

interface Props {
  children: React.ReactNode;
  width: number;
}

// A single shelf compartment: the back panel of the cabinet, a row
// of books resting against it, and the wooden plank they stand on.
//
// Layout:
//   [   back panel (slightly darker than bgApp)   ]   ← visible behind/above books
//   [   books row, bottom-aligned                 ]
//   [   wooden plank                              ]   ← books rest on this
//
// The back panel makes shelves read as compartments inside a cabinet
// rather than horizontal sticks floating on the parchment background.
// Without it, books appear to hang in midair against bgApp; with it,
// they sit inside a recessed niche.
//
// Books are still bottom-aligned within the row, so the foot of every
// spine sits flush on the plank and taller books rise into the
// compartment above shorter ones — exactly like a real bookshelf
// where book heights vary.
const COMPARTMENT_MIN_HEIGHT = 150;

export function Shelf({ children, width }: Props) {
  const { theme } = useTheme();
  // Wood tone for the plank — three-way fork so the shelf reads
  // palette-consistent in every theme:
  //   light   → warm tan plank, cream lip, sepia shadow (oak-on-paper)
  //   dark    → slate plank, brighter slate lip, near-black shadow
  //             (industrial / nighttime feel)
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
  // For leather, that means a deeper saddle-brown recess — not the
  // near-black used in dark mode, which would clash with the warm
  // surrounding palette.
  const backPanelColor =
    theme.mode === "light" ? "#d8cca6" :
    theme.mode === "leather" ? "#2a1810" :
    "#15191a";
  const backTopShadow =
    theme.mode === "light" ? "rgba(50, 30, 12, 0.18)" :
    theme.mode === "leather" ? "rgba(15, 5, 0, 0.5)" :
    "rgba(0, 0, 0, 0.5)";

  return (
    <View style={[styles.wrap, { width }]}>
      <View style={[styles.compartment, { width, minHeight: COMPARTMENT_MIN_HEIGHT }]}>
        {/* Back panel fills the compartment behind the books */}
        <View style={[styles.backPanel, { backgroundColor: backPanelColor }]}>
          {/* Top shadow line — the shelf above casts a thin band of
              shadow on the back wall just under the cabinet ceiling. */}
          <View style={[styles.backTopShadow, { backgroundColor: backTopShadow }]} />
        </View>
        {/* Books row sits in front of the back panel */}
        <View style={[styles.booksRow, { width }]}>{children}</View>
      </View>
      <View style={[styles.shelfPlank, { backgroundColor: plankColor, width }]}>
        <View style={[styles.shelfLip, { backgroundColor: plankLip }]} />
        <View style={[styles.shelfShadow, { backgroundColor: plankShadow }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "center",
    marginBottom: 22,
  },
  compartment: {
    // position: relative is implicit; backPanel is absolute children.
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
    borderRadius: 2,
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
