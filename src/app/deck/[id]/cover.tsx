import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from "react-native";
// expo-image so a GIF deck cover animates cross-platform.
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCardsStore } from "@/store/cardsStore";
import { useDecksStore } from "@/store/decksStore";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF, FONT_DISPLAY, FONT_DISPLAY_ITALIC } from "@/theme/fonts";
import { PaperBackground } from "@/components/PaperBackground";
import { Ornament } from "@/components/Ornament";
import { ShuffleIcon } from "@/components/ShuffleIcon";

// Title page — the deliberate moment between picking a book off the
// bookshelf (Study tab) and actually reading it (Study session).
// Shows the cover image, full deck name, description, card count, and
// a shuffle toggle so the user can decide their reading mode before
// the cards begin.
//
// Reached only from Study tab's BookSpine tap; "Study from this card"
// and the Deck Detail Study button still go straight to the session,
// since those entries are scoped to authoring/management.
//
// "Begin reading" uses router.replace so the back button from the
// study session pops directly back to the Study tab (not back through
// the cover screen).
export default function CoverScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id: initialId } = useLocalSearchParams<{ id: string }>();
  // Whole deck list, so the cover can carousel between adjacent
  // titles via swipe. Ordered the same way the bookshelf packs them.
  const decks = useDecksStore((s) => s.decks);
  const counts = useCardsStore((s) => s.counts);
  const { width, height } = useWindowDimensions();

  // Where the user came in from — find that deck's position in the
  // ordered list so we can carousel from it. Re-deriving via useMemo
  // means if the user backs out and re-enters with a different id,
  // the start position updates.
  const initialIndex = useMemo(() => {
    const i = decks.findIndex((d) => d.id === initialId);
    return Math.max(0, i);
  }, [decks, initialId]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  // Re-sync on deck list churn (e.g., user deleted a deck while on
  // this screen — fall back to clamped index, not stale state).
  useEffect(() => {
    setCurrentIndex((prev) => Math.min(Math.max(0, prev), decks.length - 1));
  }, [decks.length]);

  const deck = decks[currentIndex];
  const count = deck ? counts[deck.id] ?? 0 : 0;

  // Entrance animation — fade + rise + slight scale. Mimics a page
  // being lifted from below as if the user is opening the book.
  const progress = useSharedValue(0);
  // Horizontal carousel slide — driven by the Pan gesture's onEnd
  // worklet (next/prev deck). Stays separate from progress so the
  // entrance fade isn't disturbed by mid-session swipes.
  const carouselX = useSharedValue(0);
  const animating = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  const enterStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: 24 * (1 - progress.value) },
      { translateX: carouselX.value },
      { scale: 0.96 + 0.04 * progress.value },
    ],
  }));

  if (!deck) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bgApp }]}>
        <PaperBackground seed={0x4ca8d2} />
        <Stack.Screen options={{ title: "Cover" }} />
        <View style={styles.center}>
          <Text style={{ fontFamily: FONT_SERIF, fontStyle: "italic", color: theme.colors.textMuted }}>
            Deck not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasCover = !!deck.coverImage;
  const shuffle = deck.shuffleEnabled;
  const setShuffle = (next: boolean) => {
    useDecksStore.getState().setShuffleEnabled(deck.id, next).catch(() => {});
  };
  const beginStudy = () => {
    router.replace({
      pathname: "/deck/[id]/study",
      params: { id: deck.id },
    } as never);
  };

  // Carousel navigation. Slide the current cover off in the direction
  // of the swipe, swap currentIndex (which re-derives `deck`), then
  // slide the new cover in from the opposite side. The animating
  // shared value gates re-entry so a rapid second swipe doesn't pile
  // up animations.
  const goTo = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= decks.length) return;
    if (animating.value === 1) return;
    animating.value = 1;
    const dir = nextIndex > currentIndex ? -1 : 1;
    const dur = 220;
    carouselX.value = withTiming(
      dir * width,
      { duration: dur, easing: Easing.in(Easing.cubic) },
      () => {
        runOnJS(setCurrentIndex)(nextIndex);
        carouselX.value = -dir * width;
        carouselX.value = withTiming(
          0,
          { duration: dur, easing: Easing.out(Easing.cubic) },
          () => {
            animating.value = 0;
          }
        );
      }
    );
  };

  // Pan: sideways swipe → carousel. Activate only after 16 px of
  // horizontal travel so a tap (no movement) doesn't race the pan.
  const pan = Gesture.Pan()
    .activeOffsetX([-16, 16])
    .onEnd((e) => {
      "worklet";
      if (e.translationX < -60) runOnJS(goTo)(currentIndex + 1);
      else if (e.translationX > 60) runOnJS(goTo)(currentIndex - 1);
    });
  // Tap: open the currently displayed deck for reading.
  const tap = Gesture.Tap().onEnd(() => {
    "worklet";
    if (count > 0) runOnJS(beginStudy)();
  });
  // Race so a finger that taps without moving fires tap; one that
  // moves sideways enough wins as a pan.
  const coverGesture = Gesture.Race(tap, pan);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bgApp }]} edges={["top", "left", "right", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <PaperBackground seed={0x4ca8d2} />

      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}
          style={styles.closeBtn}
          hitSlop={8}
        >
          <Text style={[styles.closeGlyph, { color: theme.colors.textPrimary }]}>✕</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { minHeight: height - 160 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* The cover frame is the book AND the gesture target.
              Tap → open the displayed deck for reading. Swipe
              sideways → carousel to the previous / next deck on the
              bookshelf. If the deck has a cover image, it fills the
              entire frame and the title sits in a translucent
              parchment cartouche near the bottom. If not, the frame
              becomes a typographic cover — emoji, title, and ornament
              centered on bgCard. */}
          <GestureDetector gesture={coverGesture}>
            <Animated.View
              accessibilityRole="button"
              accessibilityLabel={`Open ${deck.name} for reading. Swipe to browse other books.`}
              style={[
                styles.coverFrame,
                enterStyle,
                {
                  borderColor: theme.colors.accentSoft,
                  backgroundColor: theme.colors.bgCard,
                  opacity: count === 0 ? 0.4 : 1,
                },
              ]}
            >
            {hasCover ? (
              <>
                <Image
                  source={{ uri: deck.coverImage as string }}
                  style={styles.coverImageFull}
                  contentFit="cover"
                />
                {/* Title cartouche overlaid on the cover image. Semi-
                    translucent so the cover art shows through behind
                    the title text — like a label printed on a dust
                    jacket. Theme-aware so the cartouche stays legible
                    in both modes. */}
                <View
                  style={[
                    styles.titleBand,
                    {
                      // Cartouche background:
                      //   light   → parchment-cream label strip
                      //   dark    → near-black slate
                      //   leather → rich saddle-brown leather plaque
                      // Border-top is a thin highlight on the
                      // cartouche's top edge — sepia on light,
                      // cream on dark/leather (so the lip catches
                      // the eye against the darker cover behind).
                      backgroundColor:
                        theme.mode === "light"
                          ? "rgba(245, 236, 212, 0.92)"
                          : theme.mode === "leather"
                          ? "rgba(50, 30, 16, 0.92)"
                          : "rgba(20, 22, 18, 0.88)",
                      borderTopColor:
                        theme.mode === "light"
                          ? "rgba(60, 40, 20, 0.45)"
                          : theme.mode === "leather"
                          ? "rgba(240, 220, 180, 0.4)"
                          : "rgba(240, 230, 207, 0.35)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.emojiOnCover,
                      { color: theme.colors.textPrimary },
                    ]}
                  >
                    {deck.emoji ?? "✦"}
                  </Text>
                  <Text
                    style={[
                      styles.titleOnCover,
                      { color: theme.colors.textPrimary },
                    ]}
                    numberOfLines={3}
                  >
                    {deck.name}
                  </Text>
                  <View style={{ width: 100, marginTop: 4 }}>
                    <Ornament width={100} glyph="·" />
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.typographicCover}>
                <Text
                  style={[
                    styles.emojiTypographic,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  {deck.emoji ?? "✦"}
                </Text>
                <Text
                  style={[
                    styles.titleTypographic,
                    { color: theme.colors.textPrimary },
                  ]}
                  numberOfLines={4}
                >
                  {deck.name}
                </Text>
                <View style={{ width: 130, marginTop: 18 }}>
                  <Ornament width={130} />
                </View>
              </View>
            )}
            </Animated.View>
          </GestureDetector>

          {/* Description and card count sit BELOW the cover, like
              jacket flap copy. Description gets the italic Garamond
              treatment; card count is small and muted. */}
          {deck.description ? (
            <Text style={[styles.desc, { color: theme.colors.textMuted }]}>
              {deck.description}
            </Text>
          ) : null}

          <Text style={[styles.count, { color: theme.colors.textMuted }]}>
            {count === 0 ? "empty" : count === 1 ? "1 card" : `${count} cards`}
          </Text>

          {/* Carousel position hint — small italic "n of N" so users
              know there are other books to swipe through. Only shown
              when there are multiple decks (single deck = nothing to
              carousel). */}
          {decks.length > 1 && (
            <Text style={[styles.carouselPos, { color: theme.colors.textMuted }]}>
              {currentIndex + 1} of {decks.length}  ·  swipe to browse
            </Text>
          )}
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={shuffle ? "Disable shuffle" : "Enable shuffle"}
          onPress={() => setShuffle(!shuffle)}
          style={[styles.shuffleBtn, { borderColor: theme.colors.accentSoft }]}
          hitSlop={6}
        >
          <ShuffleIcon
            on={shuffle}
            color={shuffle ? theme.colors.accentPrimary : theme.colors.textMuted}
            size={18}
          />
          <Text style={[styles.shuffleLabel, { color: shuffle ? theme.colors.accentPrimary : theme.colors.textMuted }]}>
            Shuffle {shuffle ? "on" : "off"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  closeGlyph: { fontSize: 22, fontWeight: "300" },
  scroll: {
    paddingHorizontal: 28,
    paddingTop: 4,
    paddingBottom: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  // The cover frame IS the book cover — large, portrait-oriented,
  // bordered with a hairline accentSoft stroke and lifted by a soft
  // drop shadow so it reads as a physical object resting on the
  // paper page behind it. 75 % width × 0.68 aspect lands at typical
  // hardcover proportions and stays comfortably tall on phone
  // screens without dominating the layout.
  coverFrame: {
    width: "75%",
    aspectRatio: 0.68,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 5,
  },
  // When a cover image exists it fills the entire frame; positioned
  // absolute so the title cartouche can overlay it without disturbing
  // its layout.
  coverImageFull: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  // Title cartouche — semi-translucent label at the bottom third of
  // the cover with the emoji + name overlaid. Spans full frame width.
  // Functions like a printed title strip on a real dust jacket.
  titleBand: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    gap: 4,
  },
  emojiOnCover: { fontSize: 22 },
  titleOnCover: {
    fontFamily: FONT_DISPLAY,
    fontSize: 22,
    letterSpacing: 0.2,
    textAlign: "center",
    paddingHorizontal: 4,
  },
  // Without a cover image, the frame becomes a typographic cover:
  // emoji + title + ornament centered on bgCard.
  typographicCover: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emojiTypographic: { fontSize: 56, marginBottom: 12 },
  titleTypographic: {
    fontFamily: FONT_DISPLAY,
    fontSize: 32,
    letterSpacing: 0.2,
    textAlign: "center",
    paddingHorizontal: 4,
  },
  desc: {
    fontFamily: FONT_DISPLAY_ITALIC,
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 14,
    marginTop: 4,
  },
  count: {
    fontFamily: FONT_DISPLAY_ITALIC,
    fontSize: 13,
    marginTop: 10,
    letterSpacing: 0.5,
  },
  carouselPos: {
    fontFamily: FONT_DISPLAY_ITALIC,
    fontSize: 12,
    marginTop: 18,
    letterSpacing: 0.5,
    opacity: 0.75,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 10,
  },
  shuffleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  shuffleLabel: { fontFamily: FONT_DISPLAY_ITALIC, fontSize: 13 },
});
