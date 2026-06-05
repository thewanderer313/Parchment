import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_DISPLAY } from "@/theme/fonts";

interface Props {
  width: number;
}

// Crown moulding above the topmost shelf. Designed as a stepped
// classical cornice profile:
//
//   ═════════════════════════════════════════════════════════   top edge
//   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    upper chamfer
//   ▀  ▀  ▀  ▀  ▀  ▀  ▀  ▀  ▀  ▀  ▀  ▀  ▀  ▀  ▀  ▀  ▀  ▀  ▀     dentil course
//                            ✦                                  centred rosette
//   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    lower chamfer
//   ═════════════════════════════════════════════════════════   bottom shadow
//
// The dentil course is a row of small light-catching blocks running
// across the cornice — a classical Greek/Roman moulding feature that
// reads as "this is real carved millwork, not just a painted board."
// Each block renders in plankLip (the wood's highlight tone), so the
// course reads as a row of small projecting teeth lit from above; the
// gaps between are filled by the plank-colour body underneath, which
// reads as the recessed shadow between teeth.
const CORNICE_HEIGHT = 32;
const DENTIL_SIZE = 5;
const DENTIL_GAP = 4;
const DENTIL_SIDE_INSET = 10;

export function BookcaseCornice({ width }: Props) {
  const { theme } = useTheme();
  // Per-theme wood tones — same fork as Shelf so the cornice belongs
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

  // How many dentil teeth fit across the cornice, given the inset on
  // each side and the per-tooth footprint (block + gap). We use the
  // exact integer count so the row stays symmetric — leftover width
  // becomes a tiny extra inset on each side rather than a half-tooth
  // at the right edge.
  const dentilSpan = width - 2 * DENTIL_SIDE_INSET;
  const dentilStride = DENTIL_SIZE + DENTIL_GAP;
  const dentilCount = Math.max(
    0,
    Math.floor((dentilSpan + DENTIL_GAP) / dentilStride)
  );

  return (
    <View style={[styles.cornice, { width, backgroundColor: plankColor }]}>
      {/* Top edge — 1 px highlight catching the room light. */}
      <View style={[styles.topLip, { backgroundColor: plankLip }]} />
      {/* Upper chamfer line — first step in the stepped profile. */}
      <View style={[styles.upperChamfer, { backgroundColor: plankShadow }]} />
      {/* Dentil course — row of small projecting teeth in plankLip. */}
      <View style={styles.dentilCourse}>
        {Array.from({ length: dentilCount }).map((_, i) => (
          <View
            key={i}
            style={{
              width: DENTIL_SIZE,
              height: DENTIL_SIZE,
              backgroundColor: plankLip,
              opacity: 0.85,
            }}
          />
        ))}
      </View>
      {/* Centred rosette trio — three ✦ glyphs in a row, in the
          highlight tone. Reads as a row of small carved/inlaid
          rosettes along the cabinet's nameplate band. */}
      <View style={styles.ornamentSlot} pointerEvents="none">
        <View style={styles.ornamentRow}>
          <Text style={[styles.ornamentGlyph, { color: plankLip }]}>✦</Text>
          <Text style={[styles.ornamentGlyph, { color: plankLip }]}>✦</Text>
          <Text style={[styles.ornamentGlyph, { color: plankLip }]}>✦</Text>
        </View>
      </View>
      {/* Lower chamfer line — mirrors the upper chamfer. */}
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
    top: 4,
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.5,
  },
  dentilCourse: {
    position: "absolute",
    top: 8,
    left: DENTIL_SIDE_INSET,
    right: DENTIL_SIDE_INSET,
    height: DENTIL_SIZE,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  // Rosette slot is positioned BELOW the dentil course (top: 14) so
  // the glyph centres in the lower half of the cornice rather than
  // landing on top of the teeth.
  ornamentSlot: {
    position: "absolute",
    top: 14,
    left: 0,
    right: 0,
    bottom: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  ornamentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 32,
  },
  ornamentGlyph: {
    fontFamily: FONT_DISPLAY,
    fontSize: 11,
    letterSpacing: 2,
    opacity: 0.9,
  },
  lowerChamfer: {
    position: "absolute",
    bottom: 3,
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
