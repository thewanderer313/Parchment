import React from "react";
import { View, Text, Pressable, StyleSheet, Image } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF, FONT_DISPLAY, FONT_DISPLAY_ITALIC } from "@/theme/fonts";
import type { Deck } from "@/store/decksStore";

interface Props {
  deck: Deck;
  cardCount: number;
  onPress: () => void;
  onLongPress: () => void;
}

function pluralizeCards(n: number): string {
  if (n === 0) return "empty";
  if (n === 1) return "1 card";
  return `${n} cards`;
}

// Deck tile. The visual goal is "manuscript folio" — a bordered card
// with a hairline inner margin so the body sits in a frame, the deck
// name in display serif, the card count in italic flanking a small
// glyph. Reads as composed rather than auto-generated.
export function DeckTile({ deck, cardCount, onPress, onLongPress }: Props) {
  const { theme } = useTheme();
  const hasCover = !!deck.coverImage;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open deck ${deck.name}`}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.tile,
        {
          backgroundColor: theme.colors.bgCard,
          borderColor: theme.colors.accentSoft,
        },
      ]}
    >
      {hasCover && (
        <Image
          testID="deck-cover-image"
          source={{ uri: deck.coverImage as string }}
          style={styles.cover}
          resizeMode="cover"
        />
      )}
      <View style={[styles.body, hasCover && styles.bodyWithCover]}>
        <Text style={[styles.emoji, { color: theme.colors.textPrimary }]}>
          {deck.emoji ?? "📁"}
        </Text>
        <Text
          style={[styles.name, { color: theme.colors.textPrimary }]}
          numberOfLines={2}
        >
          {deck.name}
        </Text>
        <View style={styles.countRow}>
          <Text style={[styles.countOrnament, { color: theme.colors.textMuted }]}>·</Text>
          <Text style={[styles.count, { color: theme.colors.textMuted }]}>
            {pluralizeCards(cardCount)}
          </Text>
          <Text style={[styles.countOrnament, { color: theme.colors.textMuted }]}>·</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    aspectRatio: 1,
    borderRadius: 14,
    overflow: "hidden",
    // Hairline outer border in the warm accentSoft tone — gives every
    // tile a visible edge so the grid reads as a series of bordered
    // folios rather than colored rectangles fading into bgApp.
    borderWidth: StyleSheet.hairlineWidth,
  },
  cover: {
    width: "100%",
    height: "60%",
  },
  body: {
    flex: 1,
    padding: 14,
    justifyContent: "space-between",
  },
  bodyWithCover: {
    height: "40%",
    padding: 12,
  },
  emoji: {
    fontSize: 22,
  },
  name: {
    fontFamily: FONT_DISPLAY,
    fontSize: 17,
    marginTop: 4,
    letterSpacing: 0.1,
  },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginTop: 6,
  },
  count: {
    fontFamily: FONT_DISPLAY_ITALIC,
    fontSize: 12,
  },
  countOrnament: {
    fontFamily: FONT_DISPLAY,
    fontSize: 14,
    lineHeight: 14,
    opacity: 0.7,
  },
});
