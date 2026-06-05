import React, { useEffect, useState } from "react";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityIndicator, Text, View } from "react-native";
import { useCardsStore } from "@/store/cardsStore";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF } from "@/theme/fonts";
import { CardEditor, type CardEditorValues } from "@/components/CardEditor";
import { useUnsavedChangesGuard } from "@/lib/useUnsavedChangesGuard";
import { PaperBackground } from "@/components/PaperBackground";

export default function EditCardScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id, cardId } = useLocalSearchParams<{ id: string; cardId: string }>();
  // Read the deck's cards array directly rather than .find-ing inside
  // the selector — this lets us distinguish "deck not loaded yet" from
  // "deck loaded but no such card." The previous version conflated
  // both as `card === undefined` and showed "not found" the instant
  // the route mounted, which broke navigation from the search results
  // screen (search hits decks the user hasn't visited this session, so
  // the deck cache is empty when the editor opens).
  const cards = useCardsStore((s) => (id ? s.cardsByDeck[id] : undefined));
  const card = cards?.find((c) => c.id === cardId);
  const update = useCardsStore((s) => s.update);
  const loadByDeck = useCardsStore((s) => s.loadByDeck);
  const [dirty, setDirty] = useState(false);
  const { skipOnce } = useUnsavedChangesGuard(dirty);

  // Defensive load on mount — covers the search-result entry point
  // and any other deep link that arrives without the deck cached. No-
  // op when the deck is already loaded; the store sets the same
  // reference back so React doesn't see a state change.
  useEffect(() => {
    if (id && cards === undefined) {
      loadByDeck(id);
    }
  }, [id, cards, loadByDeck]);

  const handleSubmit = async (values: CardEditorValues) => {
    if (!card) return;
    await update(card.id, values);
    skipOnce();
    router.back();
  };

  // Loading state: deck hasn't finished loading yet. Show a spinner
  // rather than "Card not found" so the user doesn't read it as a
  // dead-end.
  if (cards === undefined) {
    return (
      <SafeAreaView
        edges={["bottom", "left", "right"]}
        style={{ flex: 1, backgroundColor: theme.colors.bgApp, alignItems: "center", justifyContent: "center", padding: 24 }}
      >
        <Stack.Screen options={{ title: "Edit card" }} />
        <PaperBackground seed={0xb74d28} />
        <ActivityIndicator color={theme.colors.accentPrimary} />
      </SafeAreaView>
    );
  }

  // Genuine not-found: the deck loaded, but no card with this id exists.
  // Could happen if the card was deleted on another device or the user
  // navigated via a stale link.
  if (!card) {
    return (
      <SafeAreaView
        edges={["bottom", "left", "right"]}
        style={{ flex: 1, backgroundColor: theme.colors.bgApp, alignItems: "center", justifyContent: "center", padding: 24 }}
      >
        <Stack.Screen options={{ title: "Edit card" }} />
        <PaperBackground seed={0xb74d28} />
        <View>
          <Text style={{ fontFamily: FONT_SERIF, fontSize: 16, fontStyle: "italic", color: theme.colors.textMuted }}>
            Card not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={{ flex: 1, backgroundColor: theme.colors.bgApp }}>
      <Stack.Screen options={{ title: "Edit card" }} />
      <PaperBackground seed={0xb74d28} />
      <CardEditor
        initial={{
          frontText: card.frontText, frontImages: card.frontImages,
          backText: card.backText, backImages: card.backImages,
        }}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        onDirtyChange={setDirty}
      />
    </SafeAreaView>
  );
}
