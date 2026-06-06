import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from "react-native";
// expo-image (vs react-native's stock Image) animates GIFs on both
// iOS and Android; stock Image only animates on iOS.
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS, Easing } from "react-native-reanimated";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { useDecksStore } from "@/store/decksStore";
import { useCardsStore } from "@/store/cardsStore";
import { useNavIntentStore } from "@/store/navIntentStore";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF, FONT_DISPLAY, FONT_DISPLAY_ITALIC } from "@/theme/fonts";
import { FlipCard } from "@/components/FlipCard";
import { MarkdownText } from "@/components/MarkdownText";
import { useReduceMotion } from "@/lib/useReduceMotion";
import { PaperBackground } from "@/components/PaperBackground";
import { CardJumpModal } from "@/components/CardJumpModal";
import { ShuffleIcon } from "@/components/ShuffleIcon";

function shuffleArray<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const EMPTY_CARDS: never[] = [];

export default function StudyScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  // URL no longer carries startCardId — it's read from the in-memory
  // nav intent store written by Deck Detail's "Study from this card"
  // menu. See navIntentStore for why we don't trust the URL for this.
  const { id } = useLocalSearchParams<{ id: string }>();
  // Capture once on mount via useRef + useState combo: consume the
  // intent immediately so a back-then-forward navigation doesn't
  // resurface the same intent on a session where the user expected
  // the default starting card. Using state so the value is stable
  // across renders for the positioning effect.
  const [startCardId] = useState<string | undefined>(() =>
    id ? useNavIntentStore.getState().consumeStudyStart(id) : undefined
  );
  const deck = useDecksStore((s) => s.decks.find((d) => d.id === id));
  // Use a stable empty-array reference to avoid re-deriving orderedCards on
  // every render when the deck has no loaded entry yet.
  const cards = useCardsStore((s) => s.cardsByDeck[id ?? ""] ?? EMPTY_CARDS);
  const loadByDeck = useCardsStore((s) => s.loadByDeck);
  const reduce = useReduceMotion();
  const { width } = useWindowDimensions();

  // If the user opens /study via a deep link (no preceding Deck Detail mount),
  // cards won't be in the store cache. Fire the load defensively.
  useEffect(() => {
    if (id) loadByDeck(id);
  }, [id, loadByDeck]);

  // Read shuffle from the deck so it stays in sync with the persisted value;
  // tap-to-toggle below writes through decksStore.setShuffleEnabled so the
  // preference survives leaving Study Mode and re-opening it later.
  const shuffle = deck?.shuffleEnabled ?? false;
  const setShuffle = (next: boolean) => {
    if (!deck) return;
    useDecksStore.getState().setShuffleEnabled(deck.id, next).catch(() => {
      // Persistence failure shouldn't lock the user out — fall through;
      // the in-memory state still updated via the store action's optimistic set.
    });
  };
  const orderedCards = useMemo(() => (shuffle ? shuffleArray(cards) : cards), [cards, shuffle]);

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [jumpOpen, setJumpOpen] = useState(false);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  // Use a Reanimated shared value (not a React ref) for the animating flag.
  // The withTiming completion callbacks run in the worklet thread, where
  // mutating a useRef silently no-ops — which is what was leaving this stuck
  // at "true" after the first swipe and locking out every subsequent gesture.
  // Shared values can be written from both JS and worklets.
  const animating = useSharedValue(0);
  const initialJumped = useRef(false);

  // Initial positioning — runs once as soon as cards are available.
  //
  // Previous version unconditionally reset to index 0 in the else
  // branch, which fired on every subsequent orderedCards change. The
  // Study screen also calls loadByDeck on mount, which refreshes the
  // store entry with a new array reference, retriggering this effect
  // and stomping the position the user had just been placed on. Now
  // the effect runs at most once: as soon as we see a non-empty
  // orderedCards, we honor startCardId (or fall back to 0) and flip
  // initialJumped so subsequent refreshes don't touch the index.
  useEffect(() => {
    if (initialJumped.current) return;
    if (orderedCards.length === 0) return;
    if (startCardId) {
      const i = orderedCards.findIndex((c) => c.id === startCardId);
      setIndex(i >= 0 ? i : 0);
    } else {
      setIndex(0);
    }
    setFlipped(false);
    initialJumped.current = true;
  }, [orderedCards, startCardId]);

  // Toggling shuffle mid-session reshuffles orderedCards; jump back
  // to the start of the new order so the position counter ("Card N of
  // M") is meaningful. Gated on initialJumped so this doesn't double-
  // fire alongside the positioning effect on the very first mount.
  useEffect(() => {
    if (!initialJumped.current) return;
    setIndex(0);
    setFlipped(false);
  }, [shuffle]);

  const goTo = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= orderedCards.length || animating.value === 1) return;
    animating.value = 1;
    const dir = nextIndex > index ? -1 : 1;
    const dur = reduce ? 0 : 280;
    translateX.value = withTiming(dir * width, { duration: dur, easing: Easing.out(Easing.cubic) }, () => {
      runOnJS(setIndex)(nextIndex);
      runOnJS(setFlipped)(false);
      translateX.value = -dir * width;
      translateX.value = withTiming(0, { duration: dur, easing: Easing.out(Easing.cubic) }, () => {
        animating.value = 0;
      });
    });
    opacity.value = withTiming(0.6, { duration: dur }, () => {
      opacity.value = withTiming(1, { duration: dur });
    });
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-16, 16])
    .onEnd((e) => {
      "worklet";
      if (e.translationX < -60) runOnJS(goTo)(index + 1);
      else if (e.translationX > 60) runOnJS(goTo)(index - 1);
    });

  // Swipe-up gesture for the bottom grab handle — activates only on
  // sustained upward movement (10 px threshold) so a quick tap on the
  // handle goes through to the tap recogniser below instead. On end,
  // a translation of < -40 px is treated as a deliberate "open the
  // card index" swipe.
  const jumpPan = Gesture.Pan()
    .activeOffsetY([-10, 9999])
    .onEnd((e) => {
      "worklet";
      if (e.translationY < -40) runOnJS(setJumpOpen)(true);
    });
  const jumpTap = Gesture.Tap().onEnd(() => {
    "worklet";
    runOnJS(setJumpOpen)(true);
  });
  // Race: whichever resolves first wins — a tap fires instantly, a
  // swipe-up only after the user crosses the activation threshold.
  const jumpGesture = Gesture.Race(jumpTap, jumpPan);

  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  if (!deck) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bgApp, alignItems: "center", justifyContent: "center" }]}>
        <Stack.Screen options={{ title: "Study" }} />
        <Text style={{ fontFamily: FONT_SERIF, fontStyle: "italic", color: theme.colors.textMuted }}>Deck not found</Text>
      </SafeAreaView>
    );
  }
  if (orderedCards.length === 0) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bgApp, alignItems: "center", justifyContent: "center" }]}>
        <Stack.Screen options={{ title: deck.name }} />
        <Text style={{ fontFamily: FONT_SERIF, fontStyle: "italic", color: theme.colors.textMuted }}>No cards to study</Text>
      </SafeAreaView>
    );
  }

  const current = orderedCards[index];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bgApp }]} edges={["top", "left", "right", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <PaperBackground seed={0xd3e1f9} />

      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.iconBtn}>
          <Text style={[styles.iconLabel, { color: theme.colors.textPrimary }]}>✕</Text>
        </Pressable>
        {/* Plain (non-tappable) title now — the card-jump panel
            opens via swipe-up from the bottom grab handle below. */}
        <View style={styles.titleWrap}>
          <Text style={[styles.titleDeck, { color: theme.colors.textMuted }]} numberOfLines={1}>{deck.name}</Text>
          <Text style={[styles.titleCount, { color: theme.colors.textPrimary }]}>
            Card {index + 1} of {orderedCards.length}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={shuffle ? "Disable shuffle" : "Enable shuffle"}
          onPress={() => setShuffle(!shuffle)}
          style={styles.iconBtn}
        >
          <ShuffleIcon
            on={shuffle}
            color={shuffle ? theme.colors.accentPrimary : theme.colors.textMuted}
            size={22}
          />
        </Pressable>
      </View>

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.cardArea, swipeStyle]}>
          <FlipCard
            flipped={flipped}
            onFlip={(next) => setFlipped(next)}
            front={
              <View style={styles.faceInner}>
                <Text style={[styles.hint, { color: theme.colors.textMuted }]}>FRONT</Text>
                {current.frontImages[0] && (
                  <View style={[styles.imageFrame, { borderColor: theme.colors.accentSoft }]}>
                    <Image
                      source={{ uri: current.frontImages[0] }}
                      style={styles.cardImage}
                      contentFit="contain"
                    />
                  </View>
                )}
                <View style={styles.textWrap}>
                  <MarkdownText centered>{current.frontText}</MarkdownText>
                </View>
              </View>
            }
            back={
              <View style={styles.faceInner}>
                <Text style={[styles.hint, { color: theme.colors.textMuted }]}>BACK</Text>
                {current.backImages[0] && (
                  <View style={[styles.imageFrame, { borderColor: theme.colors.accentSoft }]}>
                    <Image
                      source={{ uri: current.backImages[0] }}
                      style={styles.cardImage}
                      contentFit="contain"
                    />
                  </View>
                )}
                <View style={styles.textWrap}>
                  <MarkdownText centered>{current.backText}</MarkdownText>
                </View>
              </View>
            }
          />
        </Animated.View>
      </GestureDetector>

      <View style={styles.bottomBar}>
        <Pressable
          accessibilityRole="button"
          disabled={index === 0}
          onPress={() => goTo(index - 1)}
          style={[styles.navBtn, { opacity: index === 0 ? 0.35 : 1 }]}
        >
          <Text style={[styles.navLabel, { color: theme.colors.textBody }]}>‹ Prev</Text>
        </Pressable>

        <View style={styles.dots}>
          {orderedCards.slice(Math.max(0, index - 2), Math.min(orderedCards.length, index + 3)).map((_, i) => {
            const realIdx = Math.max(0, index - 2) + i;
            const active = realIdx === index;
            return (
              <View
                key={realIdx}
                style={[styles.dot, { backgroundColor: active ? theme.colors.accentPrimary : theme.colors.accentSoft }]}
              />
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={index === orderedCards.length - 1}
          onPress={() => goTo(index + 1)}
          style={[styles.navBtn, { opacity: index === orderedCards.length - 1 ? 0.35 : 1 }]}
        >
          <Text style={[styles.navLabel, { color: theme.colors.textBody }]}>Next ›</Text>
        </Pressable>
      </View>

      {/* Bottom grab handle. Tap or swipe-up opens the card index
          panel. The visible bar is a small horizontal pill in
          textMuted; the touch target extends ~24 px above and below
          it for finger comfort even on edge-to-edge phones. */}
      <GestureDetector gesture={jumpGesture}>
        <View
          accessibilityRole="button"
          accessibilityLabel={`Open card index. Currently card ${index + 1} of ${orderedCards.length}`}
          style={styles.jumpHandleWrap}
        >
          <View style={[styles.jumpHandleBar, { backgroundColor: theme.colors.textMuted }]} />
        </View>
      </GestureDetector>

      <CardJumpModal
        visible={jumpOpen}
        cards={orderedCards}
        currentIndex={index}
        onClose={() => setJumpOpen(false)}
        onJump={(i) => {
          setJumpOpen(false);
          setIndex(i);
          setFlipped(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  iconLabel: { fontSize: 22, fontWeight: "300" },
  titleWrap: { flex: 1, alignItems: "center" },
  titleDeck: { fontFamily: FONT_DISPLAY_ITALIC, fontSize: 13 },
  titleCount: { fontFamily: FONT_DISPLAY, fontSize: 15 },
  cardArea: { flex: 1, padding: 16 },
  // Trading-card layout: face content is vertically AND horizontally
  // centred so the (hint + image + text) column sits in the middle of
  // the card. Generous vertical padding means the column doesn't
  // crowd the top/bottom edges; flex: 1 makes faceInner fill the
  // FlipCard's content slot so centring is meaningful.
  faceInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  hint: { fontFamily: FONT_DISPLAY, fontSize: 10, letterSpacing: 3, textTransform: "uppercase" },
  // Manuscript-folio frame around the image — fixed height (220 px)
  // so the image takes a predictable amount of the card regardless of
  // intrinsic dimensions, leaving room for the centred text beneath.
  // contentFit="contain" on the Image inside preserves source aspect
  // ratio with letterboxing if the source doesn't match the frame.
  imageFrame: {
    width: "86%",
    height: 220,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  cardImage: { width: "100%", height: "100%" },
  // Text container under the image — full row width minus a small
  // horizontal inset, so multi-line text wraps to a comfortable
  // reading measure while staying centred on the card.
  textWrap: {
    width: "92%",
    alignItems: "center",
  },
  bottomBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14 },
  navBtn: { padding: 8 },
  navLabel: { fontFamily: FONT_DISPLAY, fontSize: 14 },
  dots: { flexDirection: "row", gap: 6, alignItems: "center" },
  dot: { width: 6, height: 6, borderRadius: 3 },
  jumpHandleWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 6,
    paddingBottom: 14,
  },
  jumpHandleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    opacity: 0.45,
  },
});
