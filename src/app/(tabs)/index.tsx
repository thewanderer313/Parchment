import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useDecksStore } from "@/store/decksStore";
import { useCardsStore } from "@/store/cardsStore";
import { useTheme } from "@/theme/ThemeProvider";
import { DeckTile } from "@/components/DeckTile";
import { ActionSheet, type ActionSheetItem } from "@/components/ActionSheet";
import { Ornament } from "@/components/Ornament";
import type { Deck } from "@/store/decksStore";
import { FONT_SERIF, FONT_DISPLAY, FONT_DISPLAY_ITALIC } from "@/theme/fonts";

// Study tab — the default landing screen. Tapping a deck pushes
// directly into the study session (skipping Deck Detail), which is
// the whole point of having Study as its own mode.
//
// Long-press still surfaces a short management menu so the user
// doesn't have to bounce to the Library tab for the common cases
// (open Deck Detail, start over from card 1, jump to settings).
export default function StudyTab() {
  const { theme } = useTheme();
  const decks = useDecksStore((s) => s.decks);
  const counts = useCardsStore((s) => s.counts);
  const router = useRouter();
  const [menuDeck, setMenuDeck] = useState<Deck | null>(null);

  const menuItems: ActionSheetItem[] = menuDeck
    ? [
        {
          label: "Start studying",
          onPress: () =>
            router.push({
              pathname: "/deck/[id]/study",
              params: { id: menuDeck.id },
            } as never),
        },
        {
          label: "Open in Library",
          onPress: () =>
            router.push({
              pathname: "/deck/[id]",
              params: { id: menuDeck.id },
            } as never),
        },
      ]
    : [];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bgApp }]} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View style={styles.titleColumn}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Study</Text>
          <View style={styles.ornamentWrap}>
            <Ornament width={84} />
          </View>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            {decks.length === 0
              ? "Nothing on your desk just yet"
              : `Tap a deck to begin`}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          style={styles.gearBtn}
          onPress={() => router.push("/settings" as never)}
        >
          <Text style={[styles.gearGlyph, { color: theme.colors.textMuted }]}>⚙</Text>
        </Pressable>
      </View>

      {decks.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyGlyph, { color: theme.colors.textMuted }]}>❦</Text>
          <Text style={[styles.emptyHeadline, { color: theme.colors.textPrimary }]}>
            A quiet shelf.
          </Text>
          <Text style={[styles.emptyCopy, { color: theme.colors.textMuted }]}>
            Hop over to the Library tab to compose your first deck.
          </Text>
        </View>
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
                onPress={() => {
                  if ((counts[item.id] ?? 0) === 0) {
                    Alert.alert(
                      `"${item.name}" is empty`,
                      "Add cards to this deck in the Library tab before studying."
                    );
                    return;
                  }
                  router.push({
                    pathname: "/deck/[id]/study",
                    params: { id: item.id },
                  } as never);
                }}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 22,
  },
  titleColumn: { alignItems: "flex-start" },
  title: {
    fontFamily: FONT_DISPLAY,
    fontSize: 38,
    letterSpacing: 0.2,
  },
  ornamentWrap: { marginTop: 2, marginBottom: 8, alignSelf: "stretch", alignItems: "flex-start" },
  subtitle: {
    fontFamily: FONT_DISPLAY_ITALIC,
    fontSize: 15,
  },
  gearBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", marginTop: 6 },
  gearGlyph: { fontSize: 22 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: { gap: 12, marginBottom: 12 },
  tileWrap: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  emptyGlyph: { fontSize: 38, fontFamily: FONT_DISPLAY, marginBottom: 6 },
  emptyHeadline: { fontFamily: FONT_DISPLAY, fontSize: 22 },
  emptyCopy: { fontFamily: FONT_SERIF, fontSize: 14, fontStyle: "italic", textAlign: "center", maxWidth: 280 },
});
