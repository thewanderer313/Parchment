import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet, FlatList, Alert, Platform, ActionSheetIOS } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { useDecksStore } from "@/store/decksStore";
import { useCardsStore } from "@/store/cardsStore";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF } from "@/theme/fonts";
import { CardRow } from "@/components/CardRow";

// Stable empty-array reference so the cards selector below doesn't return a
// new `[]` on every render — which would cause Zustand's getSnapshot to
// report a change every render and re-trigger the component infinitely.
const EMPTY_CARDS: never[] = [];

type MenuChoice = "edit" | "delete" | "cancel";

function showCardMenu(onChoose: (c: MenuChoice) => void) {
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      { options: ["Cancel", "Edit", "Delete"], destructiveButtonIndex: 2, cancelButtonIndex: 0 },
      (i) => {
        if (i === 1) onChoose("edit");
        else if (i === 2) onChoose("delete");
        else onChoose("cancel");
      }
    );
  } else {
    Alert.alert("Card", "", [
      { text: "Cancel", style: "cancel", onPress: () => onChoose("cancel") },
      { text: "Edit", onPress: () => onChoose("edit") },
      { text: "Delete", style: "destructive", onPress: () => onChoose("delete") },
    ]);
  }
}

export default function DeckDetailScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const deck = useDecksStore((s) => s.decks.find((d) => d.id === id));
  const cards = useCardsStore((s) => s.cardsByDeck[id ?? ""] ?? EMPTY_CARDS);
  const loadByDeck = useCardsStore((s) => s.loadByDeck);

  useEffect(() => {
    if (id) loadByDeck(id);
  }, [id, loadByDeck]);

  if (!deck) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bgApp, alignItems: "center", justifyContent: "center" }]} edges={["bottom", "left", "right"]}>
        <Stack.Screen options={{ title: "Deck" }} />
        <Text style={{ fontFamily: FONT_SERIF, fontSize: 16, fontStyle: "italic", color: theme.colors.textMuted }}>
          Deck not found
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bgApp }]} edges={["bottom", "left", "right"]}>
      <Stack.Screen options={{ title: deck.name }} />
      <View style={styles.header}>
        <Text style={[styles.emoji, { color: theme.colors.textPrimary }]}>{deck.emoji ?? "📁"}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: theme.colors.textPrimary }]} numberOfLines={2}>{deck.name}</Text>
          {deck.description && (
            <Text style={[styles.desc, { color: theme.colors.textMuted }]} numberOfLines={3}>
              {deck.description}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: "/deck/[id]/study", params: { id: deck.id } } as never)}
          disabled={cards.length === 0}
          style={[
            styles.btnPrimary,
            { backgroundColor: theme.colors.accentPrimary, opacity: cards.length === 0 ? 0.4 : 1 },
          ]}
        >
          <Text style={[styles.btnPrimaryLabel, { color: theme.colors.bgCard }]}>Study</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: "/deck/[id]/card/new", params: { id: deck.id } } as never)}
          style={[styles.btnGhost, { borderColor: theme.colors.accentSoft }]}
        >
          <Text style={[styles.btnGhostLabel, { color: theme.colors.textBody }]}>+ Add card</Text>
        </Pressable>
      </View>

      {cards.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyGlyph, { color: theme.colors.textMuted }]}>🎴</Text>
          <Text style={[styles.emptyCopy, { color: theme.colors.textMuted }]}>No cards yet. Tap "+ Add card" to create one.</Text>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <CardRow
              card={item}
              onPress={() =>
                router.push({ pathname: "/deck/[id]/card/[cardId]/edit", params: { id: deck.id, cardId: item.id } } as never)
              }
              onLongPress={() =>
                showCardMenu((c) => {
                  if (c === "edit")
                    router.push({ pathname: "/deck/[id]/card/[cardId]/edit", params: { id: deck.id, cardId: item.id } } as never);
                  else if (c === "delete")
                    Alert.alert("Delete card?", "This will permanently remove the card.", [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => {
                          useCardsStore.getState().delete(item.id, deck.id).catch((e) =>
                            Alert.alert("Couldn't delete card", e.message)
                          );
                        },
                      },
                    ]);
                })
              }
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 12 },
  emoji: { fontSize: 36 },
  name: { fontFamily: FONT_SERIF, fontSize: 22, fontWeight: "700", letterSpacing: -0.3 },
  desc: { fontFamily: FONT_SERIF, fontSize: 13, fontStyle: "italic", marginTop: 4 },
  actions: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingBottom: 16 },
  btnPrimary: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 999 },
  btnPrimaryLabel: { fontFamily: FONT_SERIF, fontSize: 14, fontWeight: "600" },
  btnGhost: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  btnGhostLabel: { fontFamily: FONT_SERIF, fontSize: 14, fontWeight: "600" },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  emptyGlyph: { fontSize: 48 },
  emptyCopy: { fontFamily: FONT_SERIF, fontSize: 14, fontStyle: "italic", textAlign: "center", maxWidth: 280 },
});
