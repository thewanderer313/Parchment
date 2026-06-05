import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_DISPLAY } from "@/theme/fonts";

interface Props {
  width: number;
}

// Crown moulding above the topmost shelf. Designed as a refined
// architectural profile rather than a flat plank:
//
//   ═════════════════════════════════════════   ← top highlight (catches light)
//   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    ← upper chamfer line
//
//                       ✦                       ← centred ornament
//
//   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    ← lower chamfer line
//   ═════════════════════════════════════════   ← bottom shadow
//
// The two chamfer lines bracket the ornament and suggest the stepped
// profile a real cornice moulding has — without forcing us to draw
// actual curved bevels. The centred ✦ in plankLip (the same colour as
// the light-catching highlights) reads as a small carved or inlaid
// rosette: the cabinet's nameplate, basically.
const CORNICE_HEIGHT = 26;

export function BookcaseCornice({ width }: Props) {
  const { theme } = useTheme();
  // Per-theme wood tones — same fork as Shelf so the cornice reads
  // as the same piece of furniture.
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
      {/* Top edge — 1 px highlight catching the room light. */}
      <View style={[styles.topLip, { backgroundColor: plankLip }]} />
      {/* Upper chamfer line — suggests the first step in the
          stepped moulding profile. */}
      <View style={[styles.upperChamfer, { backgroundColor: plankShadow }]} />
      {/* Centred ornament — a small ✦ in the highlight tone, sized
          to feel like a carved rosette rather than a typographic
          glyph. */}
      <View style={styles.ornamentSlot} pointerEvents="none">
        <Text style={[styles.ornamentGlyph, { color: plankLip }]}>✦</Text>
      </View>
      {/* Lower chamfer line — mirrors the upper chamfer, bracketing
          the ornament between two symmetric steps. */}
      <View style={[styles.lowerChamfer, { backgroundColor: plankShadow }]} />
      {/* Bottom edge — 2 px shadow where the cornice meets the
          topmost compartment. */}
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
    opacity: 0.95,
  },
  upperChamfer: {
    position: "absolute",
    top: 5,
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.5,
  },
  // The slot fills the full cornice — alignItems: center vertically
  // centres the ornament glyph between the chamfer lines.
  ornamentSlot: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  ornamentGlyph: {
    fontFamily: FONT_DISPLAY,
    fontSize: 11,
    letterSpacing: 2,
    opacity: 0.9,
  },
  lowerChamfer: {
    position: "absolute",
    bottom: 5,
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.5,
  },
  bottomShadow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
});
