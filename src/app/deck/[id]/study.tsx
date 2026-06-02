import React, { useEffect, useMemo, useState, useRef } from "react";
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS, Easing } from "react-native-reanimated";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { useDecksStore } from "@/store/decksStore";
import { useCardsStore } from "@/store/cardsStore";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF } from "@/theme/fonts";
import { FlipCard } from "@/components/FlipCard";
import { MarkdownText } from "@/components/MarkdownText";
import { useReduceMotion } from "@/lib/useReduceMotion";

function shuffleArray<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function StudyScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const deck = useDecksStore((s) => s.decks.find((d) => d.id === id));
  const cards = useCardsStore((s) => s.cardsByDeck[id ?? ""] ?? []);
  const reduce = useReduceMotion();
  const { width } = useWindowDimensions();

  const [shuffle, setShuffle] = useState<boolean>(deck?.shuffleEnabled ?? false);
  const orderedCards = useMemo(() => (shuffle ? shuffleArray(cards) : cards), [cards, shuffle]);

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const animating = useRef(false);

  useEffect(() => { setIndex(0); setFlipped(false); }, [orderedCards]);

  const goTo = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= orderedCards.length || animating.current) return;
    animating.current = true;
    const dir = nextIndex > index ? -1 : 1;
    const dur = reduce ? 0 : 280;
    translateX.value = withTiming(dir * width, { duration: dur, easing: Easing.out(Easing.cubic) }, () => {
      runOnJS(setIndex)(nextIndex);
      runOnJS(setFlipped)(false);
      translateX.value = -dir * width;
      translateX.value = withTiming(0, { duration: dur, easing: Easing.out(Easing.cubic) }, () => {
        animating.current = false;
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

      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.iconBtn}>
          <Text style={[styles.iconLabel, { color: theme.colors.textPrimary }]}>✕</Text>
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={[styles.titleDeck, { color: theme.colors.textMuted }]} numberOfLines={1}>{deck.name}</Text>
          <Text style={[styles.titleCount, { color: theme.colors.textPrimary }]}>Card {index + 1} of {orderedCards.length}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Toggle shuffle"
          onPress={() => setShuffle((s) => !s)}
          style={styles.iconBtn}
        >
          <Text style={[styles.iconLabel, { color: shuffle ? theme.colors.accentPrimary : theme.colors.textMuted }]}>⇄</Text>
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
                <MarkdownText>{current.frontText}</MarkdownText>
              </View>
            }
            back={
              <View style={styles.faceInner}>
                <Text style={[styles.hint, { color: theme.colors.textMuted }]}>BACK</Text>
                <MarkdownText>{current.backText}</MarkdownText>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  iconLabel: { fontSize: 22, fontWeight: "300" },
  titleWrap: { flex: 1, alignItems: "center" },
  titleDeck: { fontFamily: FONT_SERIF, fontSize: 12, fontStyle: "italic" },
  titleCount: { fontFamily: FONT_SERIF, fontSize: 14, fontWeight: "600" },
  cardArea: { flex: 1, padding: 16 },
  faceInner: { gap: 14, alignItems: "center" },
  hint: { fontFamily: FONT_SERIF, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase" },
  bottomBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14 },
  navBtn: { padding: 8 },
  navLabel: { fontFamily: FONT_SERIF, fontSize: 14, fontWeight: "600" },
  dots: { flexDirection: "row", gap: 6, alignItems: "center" },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
