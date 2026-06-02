import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF } from "@/theme/fonts";

const EMPTY_COPY = "Tap + to create your first deck";

export function EmptyDeckList() {
  const { theme } = useTheme();
  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Empty library. ${EMPTY_COPY}.`}
    >
      <Text style={[styles.glyph, { color: theme.colors.textMuted }]} accessible={false}>
        📚
      </Text>
      <Text style={[styles.copy, { color: theme.colors.textMuted }]} accessible={false}>
        {EMPTY_COPY}
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
    gap: 16,
  },
  glyph: { fontSize: 48 },
  copy: {
    fontFamily: FONT_SERIF,
    fontSize: 15,
    fontStyle: "italic",
    textAlign: "center",
  },
});
