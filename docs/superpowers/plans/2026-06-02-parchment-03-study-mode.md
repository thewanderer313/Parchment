# Parchment — Plan 03: Study Mode

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tap a deck's "Study" button → full-screen card view. Tap the card to flip with a 380 ms horizontal 3D rotation. Swipe horizontally to go to the next/previous card. A shuffle toggle in the top bar randomizes the order. Progress dots + a Card N of M counter.

**Architecture:** A single `study.tsx` route holds the active deck's card list, current index, and flipped/shuffle state. The card view is `FlipCard` — a `View` with two faces rendered into a single 3D-transformed container driven by Reanimated 3 shared values. The swipe gesture uses Gesture Handler's `Pan` recognizer; releasing past a threshold animates to the next/previous index. Honors `AccessibilityInfo.isReduceMotionEnabled()` — when on, the flip becomes a fade and swipes are instant.

**Tech Stack additions:** none — `react-native-reanimated` and `react-native-gesture-handler` are already installed.

---

## Task 1: useReduceMotion hook + FlipCard component (TDD)

**Files:**
- Create: `src/lib/useReduceMotion.ts`
- Create: `src/components/FlipCard.tsx`
- Create: `src/components/__tests__/FlipCard.test.tsx`

### Phase 1.1 — useReduceMotion

```typescript
import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (mounted) setReduce(v); });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => {
      if (mounted) setReduce(v);
    });
    return () => { mounted = false; sub.remove(); };
  }, []);
  return reduce;
}
```

### Phase 1.2 — Red

Create `src/components/__tests__/FlipCard.test.tsx`:

```tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { Text } from "react-native";
import { FlipCard } from "../FlipCard";
import { ThemeProvider } from "@/theme/ThemeProvider";

describe("FlipCard", () => {
  it("renders the front face by default", () => {
    render(
      <ThemeProvider mode="light">
        <FlipCard front={<Text>FRONT</Text>} back={<Text>BACK</Text>} />
      </ThemeProvider>
    );
    expect(screen.getByText("FRONT")).toBeOnTheScreen();
  });

  it("toggles between front and back when the surface is tapped", () => {
    render(
      <ThemeProvider mode="light">
        <FlipCard front={<Text>FRONT</Text>} back={<Text>BACK</Text>} />
      </ThemeProvider>
    );
    fireEvent.press(screen.getByLabelText(/flip card/i));
    expect(screen.getByText("BACK")).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText(/flip card/i));
    expect(screen.getByText("FRONT")).toBeOnTheScreen();
  });
});
```

Run, see fail. Commit (red).

### Phase 1.3 — Green

Create `src/components/FlipCard.tsx`:

```tsx
import React, { useState } from "react";
import { Pressable, View, StyleSheet } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, interpolate } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { useReduceMotion } from "@/lib/useReduceMotion";

interface Props {
  front: React.ReactNode;
  back: React.ReactNode;
  flipped?: boolean;
  onFlip?: (next: boolean) => void;
}

export function FlipCard({ front, back, flipped: controlled, onFlip }: Props) {
  const { theme } = useTheme();
  const reduce = useReduceMotion();
  const [uncontrolled, setUncontrolled] = useState(false);
  const flipped = controlled ?? uncontrolled;
  const progress = useSharedValue(0);

  React.useEffect(() => {
    const target = flipped ? 1 : 0;
    if (reduce) {
      progress.value = target;
    } else {
      progress.value = withTiming(target, { duration: 380, easing: Easing.inOut(Easing.cubic) });
    }
  }, [flipped, reduce, progress]);

  const toggle = () => {
    const next = !flipped;
    if (onFlip) onFlip(next);
    else setUncontrolled(next);
  };

  const frontStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(progress.value, [0, 1], [0, 180]);
    const opacity = reduce ? (progress.value < 0.5 ? 1 : 0) : (progress.value < 0.5 ? 1 : 0);
    return {
      transform: [{ perspective: 1200 }, { rotateY: `${rotateY}deg` }],
      opacity,
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(progress.value, [0, 1], [180, 360]);
    const opacity = progress.value > 0.5 ? 1 : 0;
    return {
      transform: [{ perspective: 1200 }, { rotateY: `${rotateY}deg` }],
      opacity,
    };
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Flip card"
      onPress={toggle}
      style={styles.root}
    >
      <Animated.View style={[styles.face, { backgroundColor: theme.colors.bgCard }, frontStyle]}>
        <View style={styles.faceContent}>{front}</View>
      </Animated.View>
      <Animated.View style={[styles.face, styles.faceBack, { backgroundColor: theme.colors.bgCard }, backStyle]}>
        <View style={styles.faceContent}>{back}</View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  face: {
    position: "absolute",
    inset: 0,
    borderRadius: 18,
    overflow: "hidden",
    backfaceVisibility: "hidden",
  },
  faceBack: {},
  faceContent: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
});
```

Run tests — expect 2/2 pass. Commit (green).

---

## Task 2: Study screen

**Files:**
- Create: `src/app/deck/[id]/study.tsx`
- Modify: `src/app/deck/[id]/index.tsx` (remove the as-never cast on the Study button)

Create `src/app/deck/[id]/study.tsx`:

```tsx
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
          {orderedCards.slice(Math.max(0, index - 2), Math.min(orderedCards.length, index + 3)).map((_, i, arr) => {
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
```

In `src/app/deck/[id]/index.tsx`, remove the `as never` cast on the Study button onPress:

Find:
```tsx
          onPress={() => router.push({ pathname: "/deck/[id]/study", params: { id: deck.id } } as never)}
```

Replace with:
```tsx
          onPress={() => router.push({ pathname: "/deck/[id]/study", params: { id: deck.id } })}
```

(May need to keep the as-never cast if Expo's stale `.expo/types/router.d.ts` rejects it. Acceptable to leave the cast — it's a build artifact issue.)

Commit:

```
Plan 03 Task 2: Study Mode screen with flip, swipe, shuffle, progress dots

Full-screen route showing one card at a time. FlipCard handles the
tap-to-flip 3D animation. Pan gesture detects horizontal swipes
(threshold 60px); release in either direction calls goTo(±1) which
translates the card off-screen, swaps the index, resets translateX,
and animates back in. Reduce Motion collapses both animations to
instant.

Top bar: × close, deck name + "Card N of M", and a ⇄ shuffle toggle
that colors accent-primary when on. Bottom bar: ‹ Prev / windowed
5-dot progress / Next ›. Shuffle re-shuffles when toggled and resets
the index. The cards are kept in cardsStore.cardsByDeck[id]; we read
from there and the Deck Detail screen has already called loadByDeck.
```

---

## Self-Review

Both tasks deliver the spec's §5.3 Study Mode behavior. Reduce Motion respect (§6 accessibility) is honored. No new dependencies. The drag-to-reorder and per-deck shuffle persistence (writing `shuffleEnabled` to SQLite) are intentionally NOT included here — Plan 05 polish can add the persistence if desired.
