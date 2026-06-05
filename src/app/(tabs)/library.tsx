import React, { useState } from "react";
import {
  View, Text, Pressable, StyleSheet, FlatList, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useDecksStore } from "@/store/decksStore";
import { useCardsStore } from "@/store/cardsStore";
import { useTheme } from "@/theme/ThemeProvider";
import { exportDeck } from "@/lib/export";
import { writeAndShare } from "@/lib/share";
import { EmptyDeckList } from "@/components/EmptyDeckList";
import { DeckTile } from "@/components/DeckTile";
import { ActionSheet, type ActionSheetItem } from "@/components/ActionSheet";
import { PasteImportModal } from "@/components/PasteImportModal";
import { useDeckImport } from "@/lib/useDeckImport";
import type { Deck } from "@/store/decksStore";
import { FONT_SERIF } from "@/theme/fonts";

function confirmDelete(deckName: string, onConfirm: () => void) {
  Alert.alert(
    `Delete "${deckName}"?`,
    "This will permanently remove the deck and all of its cards.",
    [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onConfirm },
    ]
  );
}

// Library tab — authoring side of the app. Same screen the user is
// already familiar with from before the bottom-tabs restructure:
// deck grid → tap to open Deck Detail → edit cards. The Study tab
// next to this one carries the reader workflow.
export default function LibraryTab() {
  const { theme } = useTheme();
  const decks = useDecksStore((s) => s.decks);
  const counts = useCardsStore((s) => s.counts);
  const router = useRouter();
  const [menuDeck, setMenuDeck] = useState<Deck | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const { busy: importing, importFromFile, importFromText } = useDeckImport();

  const addMenuItems: ActionSheetItem[] = [
    { label: "Create a new deck", onPress: () => router.push("/deck/new") },
    { label: "Import deck from file…", onPress: () => importFromFile() },
    { label: "Import deck from text…", onPress: () => setPasteOpen(true) },
  ];

  const menuItems: ActionSheetItem[] = menuDeck
    ? [
        {
          label: "Edit",
          onPress: () =>
            router.push({ pathname: "/deck/[id]/edit", params: { id: menuDeck.id } }),
        },
        {
          label: "Share",
          onPress: () => {
            (async () => {
              try {
                const json = await exportDeck(
                  menuDeck.id,
                  useDecksStore.getState().decks,
                  useCardsStore.getState().cardsByDeck
                );
                await writeAndShare(json, `parchment-deck-${menuDeck.name}`);
              } catch (e: unknown) {
                Alert.alert(
                  "Couldn't share deck",
                  e instanceof Error ? e.message : String(e)
                );
              }
            })();
          },
        },
        {
          label: "Delete",
          destructive: true,
          onPress: () =>
            confirmDelete(menuDeck.name, () => {
              useDecksStore
                .getState()
                .delete(menuDeck.id)
                .catch((e) => Alert.alert("Couldn't delete deck", e.message));
            }),
        },
      ]
    : [];

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.colors.bgApp }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Library</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            {decks.length === 0
              ? "Your library is empty"
              : `${decks.length} ${decks.length === 1 ? "collection" : "collections"}`}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            style={styles.gearBtn}
            onPress={() => router.push("/settings" as never)}
          >
            <Text style={[styles.gearGlyph, { color: theme.colors.textMuted }]}>⚙</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add deck"
            disabled={importing}
            style={[styles.plus, { backgroundColor: theme.colors.accentPrimary, opacity: importing ? 0.5 : 1 }]}
            onPress={() => setAddMenuOpen(true)}
          >
            <Text style={[styles.plusGlyph, { color: theme.colors.bgCard }]}>+</Text>
          </Pressable>
        </View>
      </View>

      {decks.length === 0 ? (
        <EmptyDeckList />
      ) : (
        <FlatList
          data={decks}
          keyExtractor={(d) => d.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.tileWrap}>
              <DeckTile
                deck={item}
                cardCount={counts[item.id] ?? 0}
                onPress={() => router.push({ pathname: "/deck/[id]", params: { id: item.id } } as never)}
                onLongPress={() => setMenuDeck(item)}
              />
            </View>
          )}
        />
      )}

      <ActionSheet
        visible={menuDeck !== null}
        title={menuDeck?.name}
        items={menuItems}
        onClose={() => setMenuDeck(null)}
      />
      <ActionSheet
        visible={addMenuOpen}
        title="Add a deck"
        items={addMenuItems}
        onClose={() => setAddMenuOpen(false)}
      />
      <PasteImportModal
        visible={pasteOpen}
        busy={importing}
        onClose={() => setPasteOpen(false)}
        onImport={importFromText}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  title: {
    fontFamily: FONT_SERIF,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: FONT_SERIF,
    fontSize: 13,
    fontStyle: "italic",
    marginTop: 2,
  },
  plus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  plusGlyph: { fontSize: 24, lineHeight: 26, fontWeight: "300" },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: { gap: 12, marginBottom: 12 },
  tileWrap: { flex: 1 },
  gearBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  gearGlyph: { fontSize: 22 },
});
