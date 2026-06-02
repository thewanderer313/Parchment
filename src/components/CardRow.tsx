import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF } from "@/theme/fonts";
import type { Card } from "@/store/cardsStore";

interface Props {
  card: Card;
  onPress: () => void;
  onLongPress: () => void;
}

function previewText(s: string): string {
  const trimmed = s.trim();
  if (trimmed.length === 0) return "(empty)";
  return trimmed.length > 80 ? trimmed.slice(0, 80) + "…" : trimmed;
}

export function CardRow({ card, onPress, onLongPress }: Props) {
  const { theme } = useTheme();
  const hasImage = card.frontImages.length > 0 || card.backImages.length > 0;
  const preview = previewText(card.frontText);
  const isEmpty = preview === "(empty)";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Edit card"
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.row, { backgroundColor: theme.colors.bgCard, borderColor: theme.colors.accentSoft }]}
    >
      <View style={styles.body}>
        <Text
          style={[
            styles.front,
            { color: isEmpty ? theme.colors.textMuted : theme.colors.textPrimary, fontStyle: isEmpty ? "italic" : "normal" },
          ]}
          numberOfLines={2}
        >
          {preview}
        </Text>
      </View>
      {hasImage && (
        <Text style={[styles.icon, { color: theme.colors.textMuted }]}>🖼</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  body: { flex: 1 },
  front: {
    fontFamily: FONT_SERIF,
    fontSize: 14,
  },
  icon: { fontSize: 16 },
});
