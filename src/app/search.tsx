import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useCardsStore, type SearchResult } from "@/store/cardsStore";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF, FONT_DISPLAY, FONT_DISPLAY_ITALIC } from "@/theme/fonts";
import { PaperBackground } from "@/components/PaperBackground";
import { Ornament } from "@/components/Ornament";

// Cross-app search — finds cards (or whole decks) by text. Pushed on
// top of the Library tab; back button returns the user where they
// started. Query is debounced 180 ms so a typing burst only fires
// one SQL query at the end.
const DEBOUNCE_MS = 180;

export default function SearchScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const searchCards = useCardsStore((s) => s.searchCards);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [busy, setBusy] = useState(false);

  // Debounced search — every change resets the timer; the actual
  // searchCards call fires only after DEBOUNCE_MS of quiet.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setResults([]);
      setBusy(false);
      return;
    }
    setBusy(true);
    const t = setTimeout(() => {
      searchCards(trimmed)
        .then((r) => setResults(r))
        .catch((e) => Alert.alert("Search failed", e?.message ?? String(e)))
        .finally(() => setBusy(false));
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, searchCards]);

  const openCard = useCallback(
    (r: SearchResult) => {
      router.push({
        pathname: "/deck/[id]/card/[cardId]/edit",
        params: { id: r.deck.id, cardId: r.card.id },
      } as never);
    },
    [router]
  );

  const renderBody = () => {
    if (query.trim().length === 0) {
      return <EmptyPrompt theme={theme} />;
    }
    if (busy && results.length === 0) {
      return null;
    }
    if (results.length === 0) {
      return <NoMatchesState theme={theme} query={query} />;
    }
    return (
      <FlatList
        data={results}
        keyExtractor={(r) => r.card.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <ResultRow result={item} onPress={() => openCard(item)} />
        )}
        keyboardShouldPersistTaps="handled"
      />
    );
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bgApp }]} edges={["top", "left", "right"]}>
      <Stack.Screen options={{ title: "Search" }} />
      <PaperBackground seed={0x7f12c4} />
      <View style={styles.searchRow}>
        <TextInput
          autoFocus
          accessibilityLabel="Search cards"
          placeholder="Search every card"
          placeholderTextColor={theme.colors.textMuted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          style={[
            styles.input,
            {
              color: theme.colors.textPrimary,
              borderColor: theme.colors.accentSoft,
              backgroundColor: theme.colors.bgCard,
            },
          ]}
        />
        {query.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => setQuery("")}
            hitSlop={8}
            style={styles.clearBtn}
          >
            <Text style={[styles.clearGlyph, { color: theme.colors.textMuted }]}>✕</Text>
          </Pressable>
        )}
      </View>

      {renderBody()}
    </SafeAreaView>
  );
}

function ResultRow({ result, onPress }: { result: SearchResult; onPress: () => void }) {
  const { theme } = useTheme();
  const { card, deck, matchedIn } = result;
  // Preview text: prefer the side that matched, then front, then back.
  const previewSource =
    matchedIn === "back" ? card.backText : card.frontText;
  const preview = (previewSource || "(empty)").trim().slice(0, 140);
  const isEmpty = !previewSource.trim();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open card from ${deck.name}`}
      onPress={onPress}
      style={[
        styles.row,
        { backgroundColor: theme.colors.bgCard, borderColor: theme.colors.accentSoft },
      ]}
    >
      {/* Preview text occupies the main left area; the deck identity
          sits in a column on the right so the user always sees which
          book the card belongs to without needing a "matched in X"
          confirmation badge. */}
      <View style={styles.previewCol}>
        <Text
          style={[
            styles.preview,
            {
              color: isEmpty ? theme.colors.textMuted : theme.colors.textPrimary,
              fontStyle: isEmpty ? "italic" : "normal",
            },
          ]}
          numberOfLines={3}
        >
          {preview}
        </Text>
      </View>
      <View style={[styles.deckCol, { borderLeftColor: theme.colors.accentSoft }]}>
        <Text style={[styles.deckEmoji, { color: theme.colors.textPrimary }]}>
          {deck.emoji ?? "·"}
        </Text>
        <Text
          style={[styles.deckName, { color: theme.colors.textMuted }]}
          numberOfLines={2}
        >
          {deck.name}
        </Text>
      </View>
    </Pressable>
  );
}

function EmptyPrompt({ theme }: { theme: ReturnType<typeof useTheme>["theme"] }) {
  return (
    <View style={styles.empty}>
      <Text style={[styles.emptyHeadline, { color: theme.colors.textPrimary }]}>
        Search every card.
      </Text>
      <View style={{ width: 110, marginVertical: 6 }}>
        <Ornament width={110} />
      </View>
      <Text style={[styles.emptyCopy, { color: theme.colors.textMuted }]}>
        Type a word or phrase to find matching cards across every deck.
      </Text>
    </View>
  );
}

function NoMatchesState({ theme, query }: { theme: ReturnType<typeof useTheme>["theme"]; query: string }) {
  return (
    <View style={styles.empty}>
      <Text style={[styles.emptyHeadline, { color: theme.colors.textPrimary }]}>
        Nothing found.
      </Text>
      <Text style={[styles.emptyCopy, { color: theme.colors.textMuted }]}>
        No cards or decks contain &quot;{query.trim()}&quot;.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 8,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    fontFamily: FONT_SERIF,
    fontSize: 15,
  },
  clearBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  clearGlyph: { fontSize: 18 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 12,
    gap: 12,
    alignItems: "stretch",
  },
  // Main left column — preview text takes the bulk of the row.
  previewCol: { flex: 1, justifyContent: "center" },
  // Right column — the deck identity, separated from the preview by
  // a hairline rule. Functions as a "this card lives here" label so
  // the user can scan results by source.
  deckCol: {
    width: 96,
    paddingLeft: 12,
    borderLeftWidth: StyleSheet.hairlineWidth,
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 4,
  },
  deckEmoji: { fontSize: 18 },
  deckName: {
    fontFamily: FONT_DISPLAY_ITALIC,
    fontSize: 12,
    letterSpacing: 0.1,
    lineHeight: 15,
  },
  preview: { fontFamily: FONT_SERIF, fontSize: 14, lineHeight: 20 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 8,
  },
  emptyHeadline: { fontFamily: FONT_DISPLAY, fontSize: 22, letterSpacing: 0.2 },
  emptyCopy: {
    fontFamily: FONT_SERIF,
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    maxWidth: 300,
  },
});
