import React from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { FONT_DISPLAY, FONT_DISPLAY_ITALIC } from "@/theme/fonts";
import { SPINE_LABEL_COLOR, SPINE_LABEL_DIM, type SpineDims } from "@/lib/bookshelfLayout";
import type { Deck } from "@/store/decksStore";

// Pressable wrapped with Reanimated so the spine itself can carry the
// lift animation without needing a wrapping Animated.View (which would
// throw off bottom-alignment in the Shelf row).
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  // Adaptive font size — long titles shrink so more of the name fits
  // on the spine before ellipsizing. The cover screen always shows
  // the full title regardless, so this is a "what reads on the
  // shelf" tuning, not a comprehension fix.
  const nameLen = deck.name.length;
  const labelFontSize = nameLen > 28 ? 10 : nameLen > 18 ? 11.5 : 13;

  // Lift animation — the book pulls a few px off the shelf and tilts
  // slightly when tapped, then settles back. Reads as "pulling a book
  // out to read it", and gives press feedback without needing the
  // tile-style opacity change.
  //
  // Out-cubic on the lift = pops quickly then decelerates as it
  // peaks. In-cubic on the return = accelerates from the peak then
  // settles — natural "falling back into place" curve.
  const lift = useSharedValue(0);

  const handlePress = () => {
    lift.value = withSequence(
      withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 240, easing: Easing.in(Easing.cubic) })
    );
    onPress();
  };

  const liftStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -10 * lift.value },
      { rotate: `${-2.5 * lift.value}deg` },
      { scale: 1 + 0.04 * lift.value },
    ],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`Study ${deck.name}`}
      onPress={handlePress}
      onLongPress={onLongPress}
      style={[
        styles.spine,
        {
          width: dims.width,
          height: dims.height,
          backgroundColor: dims.color,
        },
        liftStyle,
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
              fontSize: labelFontSize,
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
    </AnimatedPressable>
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
    // Soft drop shadow so each book reads as RESTING on the shelf,
    // not floating. iOS shadow props + Android elevation cover both
    // platforms; the small height offset puts the shadow on the
    // shelf plank below the book's foot.
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 2.5,
    elevation: 2,
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
