import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, TextInput, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { useDecksStore } from "@/store/decksStore";
import { useCardsStore } from "@/store/cardsStore";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF, FONT_DISPLAY, FONT_DISPLAY_ITALIC } from "@/theme/fonts";
import { Ornament } from "@/components/Ornament";
import { PaperBackground } from "@/components/PaperBackground";
import { QuillOnPageIllustration } from "@/components/EmptyIllustrations";
import { CardRow } from "@/components/CardRow";
import { exportDeck } from "@/lib/export";
import { writeAndShare } from "@/lib/share";
import { ActionSheet, type ActionSheetItem } from "@/components/ActionSheet";
import type { Card } from "@/store/cardsStore";

// Stable empty-array reference so the cards selector below doesn't return a
// new `[]` on every render — which would cause Zustand's getSnapshot to
// report a change every render and re-trigger the component infinitely.
const EMPTY_CARDS: never[] = [];

export default function DeckDetailScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const deck = useDecksStore((s) => s.decks.find((d) => d.id === id));
  const cards = useCardsStore((s) => s.cardsByDeck[id ?? ""] ?? EMPTY_CARDS);
  const loadByDeck = useCardsStore((s) => s.loadByDeck);
  const [deckMenuVisible, setDeckMenuVisible] = useState(false);
  const [cardMenu, setCardMenu] = useState<Card | null>(null);
  // The "Move to another deck" picker — when non-null, an ActionSheet
  // lists every other deck so the user can choose a destination. The
  // card itself is captured in `moveCard` so closing/reopening the
  // outer menu can't lose track of which card we were moving.
  const [moveCard, setMoveCard] = useState<Card | null>(null);
  const allDecks = useDecksStore((s) => s.decks);

  // In-deck filter — for decks with many cards, scrolling 240 rows
  // to find a specific one is tedious. Typing in this input narrows
  // the visible list synchronously (filter runs against in-memory
  // data so no debounce needed). Reorder is disabled while filtering
  // because dragging a row out of a filtered context is meaningless.
  const [filter, setFilter] = useState("");
  const filteredCards = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (q.length === 0) return cards;
    return cards.filter(
      (c) =>
        c.frontText.toLowerCase().includes(q) ||
        c.backText.toLowerCase().includes(q)
    );
  }, [cards, filter]);
  // Map card id → full-deck index so the chapter numerals in CardRow
  // always reflect actual position, not position within the filtered
  // subset. O(N) once per cards change; lookup is O(1) per row.
  const indexById = useMemo(() => {
    const m = new Map<string, number>();
    cards.forEach((c, i) => m.set(c.id, i));
    return m;
  }, [cards]);
  const filtering = filter.trim().length > 0;

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

  const deckMenuItems: ActionSheetItem[] = [
    {
      label: "Edit",
      onPress: () => router.push({ pathname: "/deck/[id]/edit", params: { id: deck.id } }),
    },
    {
      label: "Share",
      onPress: () => {
        (async () => {
          try {
            const json = await exportDeck(
              deck.id,
              useDecksStore.getState().decks,
              useCardsStore.getState().cardsByDeck
            );
            await writeAndShare(json, `parchment-deck-${deck.name}`);
          } catch (e: unknown) {
            Alert.alert("Couldn't share deck", e instanceof Error ? e.message : String(e));
          }
        })();
      },
    },
    {
      label: "Delete",
      destructive: true,
      onPress: () => {
        Alert.alert(
          `Delete "${deck.name}"?`,
          "This will permanently remove the deck and all of its cards.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => {
                useDecksStore
                  .getState()
                  .delete(deck.id)
                  .then(() => router.back())
                  .catch((e) => Alert.alert("Couldn't delete deck", e.message));
              },
            },
          ]
        );
      },
    },
  ];

  // Build the move-destination ActionSheet's items: every deck OTHER
  // than the current one, ordered the same way as the Library grid.
  // Closing the sheet sets moveCard to null and reopens nothing.
  const moveDestinationItems: ActionSheetItem[] = moveCard
    ? allDecks
        .filter((d) => d.id !== deck.id)
        .map<ActionSheetItem>((d) => ({
          label: `${d.emoji ?? "·"}  ${d.name}`,
          onPress: () => {
            const cardId = moveCard.id;
            useCardsStore
              .getState()
              .move(cardId, deck.id, d.id)
              .catch((e) => Alert.alert("Couldn't move card", e?.message ?? String(e)));
          },
        }))
    : [];

  const cardMenuItems: ActionSheetItem[] = cardMenu
    ? [
        {
          label: "Study from this card",
          // URL-string form rather than the params object: with
          // typedRoutes on, the path's typed signature doesn't list
          // `startCardId`, and the `as never` cast that satisfied
          // TypeScript also let the runtime dispatch silently strip
          // the extra param. A raw URL keeps the query-string intact
          // end to end so useLocalSearchParams on the Study screen
          // can actually read startCardId.
          onPress: () => {
            const cardId = cardMenu.id;
            router.push(
              `/deck/${deck.id}/study?startCardId=${encodeURIComponent(cardId)}` as never
            );
          },
        },
        {
          label: "Move to another deck…",
          // Disabled (rendered greyed) if this is the only deck; we
          // still surface the row so the user knows the feature is
          // there, but tapping it does nothing useful so we just
          // close the menu.
          onPress: () => {
            if (allDecks.length <= 1) return;
            setMoveCard(cardMenu);
          },
        },
        {
          label: "Delete",
          destructive: true,
          onPress: () => {
            const cardId = cardMenu.id;
            Alert.alert("Delete card?", "This will permanently remove the card.", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => {
                  useCardsStore
                    .getState()
                    .delete(cardId, deck.id)
                    .catch((e) => Alert.alert("Couldn't delete card", e.message));
                },
              },
            ]);
          },
        },
      ]
    : [];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bgApp }]} edges={["bottom", "left", "right"]}>
      <Stack.Screen options={{ title: deck.name }} />
      <PaperBackground seed={0xc1a9d2} />
      <View style={styles.header}>
        <Text style={[styles.emoji, { color: theme.colors.textPrimary }]}>{deck.emoji ?? "📁"}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: theme.colors.textPrimary }]} numberOfLines={2}>{deck.name}</Text>
          <View style={styles.headerOrnament}>
            <Ornament width={64} glyph="·" />
          </View>
          {deck.description && (
            <Text style={[styles.desc, { color: theme.colors.textMuted }]} numberOfLines={3}>
              {deck.description}
            </Text>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Deck options"
          onPress={() => setDeckMenuVisible(true)}
          style={styles.menuBtn}
          hitSlop={8}
        >
          <Text style={[styles.menuGlyph, { color: theme.colors.textMuted }]}>⋮</Text>
        </Pressable>
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
          <View style={styles.emptyIlloWrap}>
            <QuillOnPageIllustration color={theme.colors.textMuted} size={140} />
          </View>
          <Text style={[styles.emptyHeadline, { color: theme.colors.textPrimary }]}>A fresh page.</Text>
          <Text style={[styles.emptyCopy, { color: theme.colors.textMuted }]}>
            Tap “+ Add card” to begin.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.filterRow}>
            <TextInput
              accessibilityLabel="Filter cards in this deck"
              placeholder={`Filter ${cards.length} card${cards.length === 1 ? "" : "s"}`}
              placeholderTextColor={theme.colors.textMuted}
              value={filter}
              onChangeText={setFilter}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              style={[
                styles.filterInput,
                {
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.accentSoft,
                  backgroundColor: theme.colors.bgCard,
                },
              ]}
            />
            {filter.length > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear filter"
                onPress={() => setFilter("")}
                hitSlop={8}
                style={styles.filterClear}
              >
                <Text style={[styles.filterClearGlyph, { color: theme.colors.textMuted }]}>✕</Text>
              </Pressable>
            )}
          </View>

          {filtering && filteredCards.length === 0 ? (
            <View style={styles.noFilterMatch}>
              <Text style={[styles.noFilterText, { color: theme.colors.textMuted }]}>
                No cards match &quot;{filter.trim()}&quot;.
              </Text>
            </View>
          ) : filtering ? (
            <FlatList
              data={filteredCards}
              keyExtractor={(c) => c.id}
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <CardRow
                  card={item}
                  index={(indexById.get(item.id) ?? 0) + 1}
                  onPress={() =>
                    router.push({ pathname: "/deck/[id]/card/[cardId]/edit", params: { id: deck.id, cardId: item.id } } as never)
                  }
                  onLongPress={() => setCardMenu(item)}
                />
              )}
            />
          ) : (
            <DraggableFlatList
              data={cards}
              keyExtractor={(c) => c.id}
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              onDragEnd={({ data }) => {
                const before = cards.map((c) => c.id).join("|");
                const after = data.map((c) => c.id).join("|");
                if (before === after) return;
                useCardsStore
                  .getState()
                  .reorder(deck.id, data.map((c) => c.id))
                  .catch((e) => Alert.alert("Couldn't reorder cards", e.message));
              }}
              renderItem={({ item, drag, getIndex }: RenderItemParams<Card>) => {
                const i = getIndex();
                return (
                  <ScaleDecorator>
                    <CardRow
                      card={item}
                      index={typeof i === "number" ? i + 1 : undefined}
                      onPress={() =>
                        router.push({ pathname: "/deck/[id]/card/[cardId]/edit", params: { id: deck.id, cardId: item.id } } as never)
                      }
                      onLongPress={() => setCardMenu(item)}
                      onDragHandlePress={drag}
                    />
                  </ScaleDecorator>
                );
              }}
            />
          )}
        </>
      )}

      <ActionSheet
        visible={deckMenuVisible}
        title={deck.name}
        items={deckMenuItems}
        onClose={() => setDeckMenuVisible(false)}
      />
      <ActionSheet
        visible={cardMenu !== null}
        title="Card"
        items={cardMenuItems}
        onClose={() => setCardMenu(null)}
      />
      <ActionSheet
        visible={moveCard !== null}
        title="Move card to…"
        items={moveDestinationItems}
        onClose={() => setMoveCard(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 12 },
  emoji: { fontSize: 36 },
  name: { fontFamily: FONT_DISPLAY, fontSize: 26, letterSpacing: 0.2 },
  headerOrnament: { marginTop: 4, marginBottom: 4, alignSelf: "flex-start", width: 64 },
  desc: { fontFamily: FONT_DISPLAY_ITALIC, fontSize: 14, marginTop: 2 },
  actions: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingBottom: 16 },
  btnPrimary: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 999 },
  btnPrimaryLabel: { fontFamily: FONT_SERIF, fontSize: 14, fontWeight: "600" },
  btnGhost: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  btnGhostLabel: { fontFamily: FONT_SERIF, fontSize: 14, fontWeight: "600" },
  // Generous bottom padding so the last card has breathing room above
  // the system gesture / navigation bar on Android, and clears the
  // home indicator on iOS — 20 was too tight, causing the last row
  // to sit flush against the bottom edge or get partially obscured.
  list: { paddingHorizontal: 20, paddingBottom: 80 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 6 },
  emptyIlloWrap: { marginBottom: 12 },
  emptyHeadline: { fontFamily: FONT_DISPLAY, fontSize: 22 },
  emptyCopy: { fontFamily: FONT_SERIF, fontSize: 14, fontStyle: "italic", textAlign: "center", maxWidth: 280, marginTop: 4 },
  menuBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  menuGlyph: { fontSize: 26, lineHeight: 26, fontWeight: "700" },
  filterRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  filterInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    fontFamily: FONT_SERIF,
    fontSize: 14,
  },
  filterClear: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  filterClearGlyph: { fontSize: 16 },
  noFilterMatch: { padding: 24, alignItems: "center" },
  noFilterText: { fontFamily: FONT_SERIF, fontSize: 14, fontStyle: "italic" },
});
