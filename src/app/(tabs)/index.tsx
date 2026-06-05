import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList, Alert, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useDecksStore } from "@/store/decksStore";
import { useCardsStore } from "@/store/cardsStore";
import { useTheme } from "@/theme/ThemeProvider";
import { ActionSheet, type ActionSheetItem } from "@/components/ActionSheet";
import { Ornament } from "@/components/Ornament";
import { BookSpine } from "@/components/BookSpine";
import { Shelf, SIDE_RAIL_WIDTH } from "@/components/Shelf";
import { PaperBackground } from "@/components/PaperBackground";
import { OpenBookIllustration } from "@/components/EmptyIllustrations";
import { packIntoShelves } from "@/lib/bookshelfLayout";
import type { Deck } from "@/store/decksStore";
import { FONT_SERIF, FONT_DISPLAY, FONT_DISPLAY_ITALIC, FONT_OLDBOOK } from "@/theme/fonts";

// Study tab — the app's default landing screen. Decks render as books
// standing on wooden shelves; tapping a book starts a study session.
// The bookshelf metaphor is the whole point of having Study be its own
// tab — it telegraphs "this is the room you read in", not "this is the
// list-of-things-you-have screen, but for studying."
//
// Authoring (long-press menu hop "Open in Library" / Library tab tap)
// still routes to Deck Detail's grid view, so editing tools aren't
// behind a metaphor.
export default function StudyTab() {
  const { theme } = useTheme();
  const decks = useDecksStore((s) => s.decks);
  const counts = useCardsStore((s) => s.counts);
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const [menuDeck, setMenuDeck] = useState<Deck | null>(null);

  // Shelf width = window width minus the screen's horizontal padding.
  // Recomputed when the window resizes (rotation, foldable, etc.) so
  // the packing stays sensible.
  const shelfWidth = windowWidth - 40;
  // Books need to fit in the compartment INSIDE the side rails, so we
  // pack against the inner width, not the outer shelf width.
  const innerShelfWidth = shelfWidth - 2 * SIDE_RAIL_WIDTH;
  const shelves = useMemo(
    () => packIntoShelves(decks, counts, innerShelfWidth),
    [decks, counts, innerShelfWidth]
  );

  const menuItems: ActionSheetItem[] = menuDeck
    ? [
        {
          label: "Start studying",
          onPress: () =>
            router.push({
              pathname: "/deck/[id]/cover",
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
      <PaperBackground seed={0x5e30af} />
      <View style={styles.header}>
        <View style={styles.titleColumn}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Study</Text>
          <View style={styles.ornamentWrap}>
            <Ornament width={84} />
          </View>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            {decks.length === 0
              ? "Nothing on your desk just yet"
              : `Pull a book down to read`}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search"
            style={styles.gearBtn}
            onPress={() => router.push("/search" as never)}
          >
            <Text style={[styles.gearGlyph, { color: theme.colors.textMuted }]}>⌕</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            style={styles.gearBtn}
            onPress={() => router.push("/settings" as never)}
          >
            <Text style={[styles.gearGlyph, { color: theme.colors.textMuted }]}>⚙</Text>
          </Pressable>
        </View>
      </View>

      {decks.length === 0 ? (
        <EmptyShelves shelfWidth={shelfWidth} />
      ) : (
        <FlatList
          data={shelves}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Shelf width={shelfWidth}>
              {item.books.map(({ deck, dims }) => (
                <BookSpine
                  key={deck.id}
                  deck={deck}
                  cardCount={counts[deck.id] ?? 0}
                  dims={dims}
                  onPress={() => {
                    if ((counts[deck.id] ?? 0) === 0) {
                      Alert.alert(
                        `"${deck.name}" is empty`,
                        "Add cards to this deck in the Library tab before studying."
                      );
                      return;
                    }
                    router.push({
                      pathname: "/deck/[id]/cover",
                      params: { id: deck.id },
                    } as never);
                  }}
                  onLongPress={() => setMenuDeck(deck)}
                />
              ))}
            </Shelf>
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

// When there are no decks yet, show three empty shelves with a
// centred message — telegraphs the metaphor so the user immediately
// understands what they're about to build.
function EmptyShelves({ shelfWidth }: { shelfWidth: number }) {
  const { theme } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIlloWrap}>
        <OpenBookIllustration color={theme.colors.textMuted} size={140} />
      </View>
      <Text style={[styles.emptyHeadline, { color: theme.colors.textPrimary }]}>
        A quiet shelf.
      </Text>
      <Text style={[styles.emptyCopy, { color: theme.colors.textMuted }]}>
        Hop over to the Library tab to compose your first deck.
      </Text>
      <View style={styles.emptyShelves}>
        <Shelf width={shelfWidth}>
          <View style={{ height: 1 }} />
        </Shelf>
        <Shelf width={shelfWidth}>
          <View style={{ height: 1 }} />
        </Shelf>
      </View>
    </View>
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
    fontFamily: FONT_OLDBOOK,
    fontSize: 46,
    letterSpacing: 0.5,
  },
  ornamentWrap: { marginTop: 2, marginBottom: 8, alignSelf: "stretch", alignItems: "flex-start" },
  subtitle: {
    fontFamily: FONT_DISPLAY_ITALIC,
    fontSize: 15,
  },
  gearBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", marginTop: 6 },
  gearGlyph: { fontSize: 22 },
  list: { paddingTop: 4, paddingBottom: 24 },
  empty: { flex: 1, alignItems: "center", padding: 24, gap: 6 },
  emptyShelves: { marginTop: 28, alignSelf: "stretch", alignItems: "center" },
  emptyIlloWrap: { marginBottom: 14 },
  emptyHeadline: { fontFamily: FONT_DISPLAY, fontSize: 22 },
  emptyCopy: { fontFamily: FONT_SERIF, fontSize: 14, fontStyle: "italic", textAlign: "center", maxWidth: 280 },
});
