import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

interface Props {
  width: number;
}

// The decorative top cap of the bookcase — a horizontal wood bar that
// sits above the topmost Shelf and caps the continuous side rails.
// Slightly thicker than the per-shelf plank (18 px vs 10 px) so it
// reads as the cabinet's crown molding rather than just another
// shelf. Spans the full outer bookcase width so it visually closes
// the side rails at the top.
//
// A thin secondary line a few px below the top edge suggests a
// routed chamfer / step in the moulding — the kind of profile a real
// cabinet cornice has — without the complexity of drawing actual
// curved profiles.
const CORNICE_HEIGHT = 18;

export function BookcaseCornice({ width }: Props) {
  const { theme } = useTheme();
  // Same per-theme wood tones as the Shelf so the cornice belongs
  // to the same piece of furniture.
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

  return (
    <View style={[styles.cornice, { width, backgroundColor: plankColor }]}>
      {/* Top-edge highlight — the cabinet's front face catches light. */}
      <View style={[styles.topLip, { backgroundColor: plankLip }]} />
      {/* Subtle routed-line decoration ~5 px from the top edge. Reads
          as a chamfer/step in the moulding profile. */}
      <View style={[styles.decoLine, { backgroundColor: plankShadow }]} />
      {/* Bottom-edge shadow — the cornice's underside is in shade
          relative to the topmost compartment beneath it. */}
      <View style={[styles.bottomShadow, { backgroundColor: plankShadow }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  cornice: {
    height: CORNICE_HEIGHT,
    alignSelf: "center",
    overflow: "hidden",
  },
  topLip: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  decoLine: {
    position: "absolute",
    top: 5,
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.55,
  },
  bottomShadow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
});
