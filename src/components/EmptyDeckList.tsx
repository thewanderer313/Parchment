import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF, FONT_DISPLAY } from "@/theme/fonts";
import { Ornament } from "@/components/Ornament";
import { BookStackIllustration } from "@/components/EmptyIllustrations";

const HEADLINE = "Empty shelves.";
const SUB = "Tap the + above to compose your first deck.";

export function EmptyDeckList() {
  const { theme } = useTheme();
  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Empty library. ${SUB}`}
    >
      <View style={styles.illoWrap} accessible={false}>
        <BookStackIllustration color={theme.colors.textMuted} size={150} />
      </View>
      <Text style={[styles.headline, { color: theme.colors.textPrimary }]} accessible={false}>
        {HEADLINE}
      </Text>
      <View style={{ width: 90, marginVertical: 4 }}>
        <Ornament width={90} glyph="·" />
      </View>
      <Text style={[styles.copy, { color: theme.colors.textMuted }]} accessible={false}>
        {SUB}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 4,
  },
  illoWrap: { marginBottom: 14 },
  headline: { fontFamily: FONT_DISPLAY, fontSize: 24, letterSpacing: 0.2 },
  copy: {
    fontFamily: FONT_SERIF,
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 4,
  },
});
