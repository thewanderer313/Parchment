import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF, FONT_DISPLAY_ITALIC } from "@/theme/fonts";
import type { Card } from "@/store/cardsStore";

interface Props {
  card: Card;
  /** 1-based position in the deck. Renders as a small italic display-
   *  serif numeral on the left of the row, like a chapter listing in a
   *  table of contents. Optional; omitted = no numeral. */
  index?: number;
  onPress: () => void;
  onLongPress: () => void;
  /** Optional drag handle press — when provided, a ≡ grip appears on the
   *  right of the row and pressing it (or long-pressing) starts a drag. */
  onDragHandlePress?: () => void;
}

function previewText(s: string): string {
  const trimmed = s.trim();
  if (trimmed.length === 0) return "(empty)";
  return trimmed.length > 80 ? trimmed.slice(0, 80) + "…" : trimmed;
}

export function CardRow({ card, index, onPress, onLongPress, onDragHandlePress }: Props) {
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
      {index !== undefined && (
        <Text style={[styles.numeral, { color: theme.colors.textMuted }]}>
          {index}.
        </Text>
      )}
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
      {onDragHandlePress && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reorder card"
          onLongPress={onDragHandlePress}
          delayLongPress={120}
          hitSlop={8}
          style={styles.gripBtn}
        >
          <Text style={[styles.grip, { color: theme.colors.textMuted }]}>≡</Text>
        </Pressable>
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
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  numeral: {
    fontFamily: FONT_DISPLAY_ITALIC,
    fontSize: 15,
    minWidth: 24,
    textAlign: "right",
    // Slightly muted so the body text remains the focus, but
    // present enough to give the row a "table of contents" rhythm.
    opacity: 0.85,
  },
  body: { flex: 1 },
  front: {
    fontFamily: FONT_SERIF,
    fontSize: 14,
  },
  icon: { fontSize: 16 },
  gripBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  grip: { fontSize: 20, fontWeight: "700" },
});
