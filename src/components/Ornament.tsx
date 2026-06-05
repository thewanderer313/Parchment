import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_DISPLAY } from "@/theme/fonts";

// A typographic ornament — two hairlines flanking a small centered
// glyph — placed under screen titles. Editorial pattern lifted from
// book design: signals "this is a deliberate composition, someone
// chose where the chapter starts." Works at any width because the
// rules flex; the glyph is a tiny EB Garamond ampersand-cousin (✦)
// that reads at small sizes.
//
// `width` lets the caller pick how wide the ornament should be (a
// big screen-title gets a big ornament; a deck-tile divider gets a
// small one). Default 96 fits the header use case.
interface Props {
  width?: number;
  glyph?: string;
  tint?: string;
}
export function Ornament({ width = 96, glyph = "✦", tint }: Props) {
  const { theme } = useTheme();
  const color = tint ?? theme.colors.textMuted;
  return (
    <View style={[styles.row, { width }]}>
      <View style={[styles.rule, { backgroundColor: color, opacity: 0.5 }]} />
      <Text style={[styles.glyph, { color, fontFamily: FONT_DISPLAY }]}>
        {glyph}
      </Text>
      <View style={[styles.rule, { backgroundColor: color, opacity: 0.5 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 8,
  },
  rule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  glyph: {
    fontSize: 11,
    letterSpacing: 1,
  },
});
