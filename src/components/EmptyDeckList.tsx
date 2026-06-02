import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

export function EmptyDeckList() {
  const { theme } = useTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.glyph, { color: theme.colors.textMuted }]}>📚</Text>
      <Text style={[styles.copy, { color: theme.colors.textMuted }]}>
        Tap + to create your first deck
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
    fontFamily: "Georgia",
    fontSize: 15,
    fontStyle: "italic",
    textAlign: "center",
  },
});
