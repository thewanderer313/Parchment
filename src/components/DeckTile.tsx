import React from "react";
import { View, Text, Pressable, StyleSheet, Image } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF } from "@/theme/fonts";
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

export function DeckTile({ deck, cardCount, onPress, onLongPress }: Props) {
  const { theme } = useTheme();
  const hasCover = !!deck.coverImage;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open deck ${deck.name}`}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.tile, { backgroundColor: theme.colors.bgCard }]}
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
        <Text style={[styles.count, { color: theme.colors.textMuted }]}>
          {pluralizeCards(cardCount)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  cover: {
    width: "100%",
    height: "60%",
  },
  body: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  bodyWithCover: {
    height: "40%",
    padding: 10,
  },
  emoji: {
    fontSize: 22,
  },
  name: {
    fontFamily: FONT_SERIF,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  count: {
    fontFamily: FONT_SERIF,
    fontSize: 11,
    fontStyle: "italic",
  },
});
