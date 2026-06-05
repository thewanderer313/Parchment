import React, { useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const deck = useDecksStore((s) => s.decks.find((d) => d.id === id));
  const count = useCardsStore((s) => (id ? s.counts[id] ?? 0 : 0));
  const { height } = useWindowDimensions();

  // Entrance animation — fade + rise + slight scale. Mimics a page
  // being lifted from below as if the user is opening the book.
  const progress = useSharedValue(0);
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

      <Animated.View style={[{ flex: 1 }, enterStyle]}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { minHeight: height - 120 }]}
          showsVerticalScrollIndicator={false}
        >
          {hasCover && (
            <View
              style={[
                styles.coverFrame,
                {
                  borderColor: theme.colors.accentSoft,
                  backgroundColor: theme.colors.bgCard,
                },
              ]}
            >
              <Image
                source={{ uri: deck.coverImage as string }}
                style={styles.coverImage}
                resizeMode="cover"
              />
            </View>
          )}

          <Text style={[styles.emoji, { color: theme.colors.textPrimary }]}>
            {deck.emoji ?? "✦"}
          </Text>

          <Text style={[styles.name, { color: theme.colors.textPrimary }]}>
            {deck.name}
          </Text>

          <View style={{ width: 140, marginTop: 10, marginBottom: 12 }}>
            <Ornament width={140} />
          </View>

          {deck.description ? (
            <Text style={[styles.desc, { color: theme.colors.textMuted }]}>
              {deck.description}
            </Text>
          ) : null}

          <Text style={[styles.count, { color: theme.colors.textMuted }]}>
            {count === 0 ? "empty" : count === 1 ? "1 card" : `${count} cards`}
          </Text>
        </ScrollView>
      </Animated.View>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={shuffle ? "Disable shuffle" : "Enable shuffle"}
          onPress={() => setShuffle(!shuffle)}
          style={[styles.shuffleBtn, { borderColor: theme.colors.accentSoft }]}
          hitSlop={6}
        >
          <Text style={[styles.shuffleGlyph, { color: shuffle ? theme.colors.accentPrimary : theme.colors.textMuted }]}>⇄</Text>
          <Text style={[styles.shuffleLabel, { color: shuffle ? theme.colors.accentPrimary : theme.colors.textMuted }]}>
            Shuffle {shuffle ? "on" : "off"}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Begin reading"
          onPress={beginStudy}
          disabled={count === 0}
          style={[
            styles.beginBtn,
            { backgroundColor: theme.colors.accentPrimary, opacity: count === 0 ? 0.4 : 1 },
          ]}
        >
          <Text style={[styles.beginLabel, { color: theme.colors.bgCard }]}>
            {count === 0 ? "Empty deck" : "Begin reading"}
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
  // Cover image framed like a manuscript folio — a hairline border in
  // accentSoft on a bgCard background. The 0.7 aspect ratio gives a
  // book-cover feel without forcing the source image into a square.
  coverFrame: {
    width: "70%",
    aspectRatio: 0.7,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginBottom: 16,
    // Subtle drop shadow so the cover reads as resting above the page.
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  coverImage: { width: "100%", height: "100%" },
  emoji: { fontSize: 44, marginTop: 6 },
  name: {
    fontFamily: FONT_DISPLAY,
    fontSize: 30,
    letterSpacing: 0.2,
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 8,
  },
  desc: {
    fontFamily: FONT_DISPLAY_ITALIC,
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 12,
    marginTop: 2,
  },
  count: {
    fontFamily: FONT_DISPLAY_ITALIC,
    fontSize: 13,
    marginTop: 12,
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    paddingTop: 10,
    gap: 12,
  },
  shuffleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  shuffleGlyph: { fontSize: 16 },
  shuffleLabel: { fontFamily: FONT_DISPLAY_ITALIC, fontSize: 13 },
  beginBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  beginLabel: { fontFamily: FONT_DISPLAY, fontSize: 15, letterSpacing: 0.5 },
});
