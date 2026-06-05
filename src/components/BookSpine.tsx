import React from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import { FONT_DISPLAY, FONT_DISPLAY_ITALIC } from "@/theme/fonts";
import { SPINE_LABEL_COLOR, SPINE_LABEL_DIM, type SpineDims } from "@/lib/bookshelfLayout";
import type { Deck } from "@/store/decksStore";

interface Props {
  deck: Deck;
  cardCount: number;
  dims: SpineDims;
  onPress: () => void;
  onLongPress: () => void;
}

// A single book spine standing on a shelf. The deck name is rotated
// -90° so it reads bottom-to-top like a real Western book spine. The
// deck emoji sits at the top (where a publisher mark would go) and
// the card count sits at the foot of the spine in italic. Hairline
// rules near top and bottom mimic the gold-tooled banding common on
// hardcover spines without committing to an actual gilt visual.
//
// Spine width, height, and color are picked deterministically from
// the deck id in bookshelfLayout.dimsForDeck — see that file for the
// reasoning.
export function BookSpine({ deck, cardCount, dims, onPress, onLongPress }: Props) {
  // The rotated name container has width = spine height (minus padding
  // for the top/bottom decorations) and height = a single text line.
  // After the -90° rotate, that footprint becomes "narrow x tall" and
  // fits inside the spine.
  const labelTrack = dims.height - 56;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Study ${deck.name}`}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.spine,
        {
          width: dims.width,
          height: dims.height,
          backgroundColor: dims.color,
        },
      ]}
    >
      {/* Top banding — two hairlines mimicking a bound book's headcap */}
      <View style={[styles.band, { top: 10 }]} />
      <View style={[styles.band, { top: 14 }]} />

      {/* Top decoration: deck emoji at the head of the spine */}
      <View style={styles.headDecor}>
        <Text style={styles.emoji}>{deck.emoji ?? "✦"}</Text>
      </View>

      {/* Vertical title: text is rotated -90° within an absolutely-
          positioned wrapper so layout calculation stays predictable.
          The wrapper is the size the text WANTS to be before rotation
          (labelTrack × line height); after rotation it occupies a
          narrow column down the spine center. */}
      <View
        pointerEvents="none"
        style={[
          styles.labelWrap,
          { width: labelTrack, top: dims.height / 2 - 11, left: dims.width / 2 - labelTrack / 2 },
        ]}
      >
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[
            styles.label,
            {
              transform: [{ rotate: "-90deg" }],
              width: labelTrack,
            },
          ]}
        >
          {deck.name}
        </Text>
      </View>

      {/* Foot banding + card count */}
      <View style={[styles.band, { bottom: 18 }]} />
      <View style={styles.footDecor}>
        <Text style={styles.count}>{cardCount}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  spine: {
    borderRadius: 2,
    overflow: "hidden",
    // Tiny inset shadow on the right edge to fake page depth — the
    // border with rgba mimics a darker page-block side.
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "rgba(0,0,0,0.25)",
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: "rgba(255,255,255,0.06)",
  },
  band: {
    position: "absolute",
    left: 6,
    right: 6,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(240,230,207,0.35)",
  },
  headDecor: {
    position: "absolute",
    top: 22,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  emoji: { fontSize: 16 },
  labelWrap: {
    position: "absolute",
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: FONT_DISPLAY,
    fontSize: 13,
    color: SPINE_LABEL_COLOR,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  footDecor: {
    position: "absolute",
    bottom: 4,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  count: {
    fontFamily: FONT_DISPLAY_ITALIC,
    fontSize: 11,
    color: SPINE_LABEL_DIM,
  },
});
