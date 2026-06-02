import React from "react";
import {
  View, Text, Pressable, StyleSheet, FlatList,
  Alert, Platform, ActionSheetIOS,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useDecksStore } from "@/store/decksStore";
import { useCardsStore } from "@/store/cardsStore";
import { useTheme } from "@/theme/ThemeProvider";
import { exportDeck } from "@/lib/export";
import { writeAndShare } from "@/lib/share";
import { EmptyDeckList } from "@/components/EmptyDeckList";
import { DeckTile } from "@/components/DeckTile";
import { FONT_SERIF } from "@/theme/fonts";

type MenuChoice = "edit" | "share" | "delete" | "cancel";

function showDeckMenu(deckName: string, onChoose: (choice: MenuChoice) => void) {
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ["Cancel", "Edit", "Share", "Delete"],
        destructiveButtonIndex: 3,
        cancelButtonIndex: 0,
        title: deckName,
      },
      (index) => {
        if (index === 1) onChoose("edit");
        else if (index === 2) onChoose("share");
        else if (index === 3) onChoose("delete");
        else onChoose("cancel");
      }
    );
  } else {
    Alert.alert(deckName, "", [
      { text: "Cancel", style: "cancel", onPress: () => onChoose("cancel") },
      { text: "Edit", onPress: () => onChoose("edit") },
      { text: "Share", onPress: () => onChoose("share") },
      { text: "Delete", style: "destructive", onPress: () => onChoose("delete") },
    ]);
  }
}

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

export default function Home() {
  const { theme } = useTheme();
  const decks = useDecksStore((s) => s.decks);
  const counts = useCardsStore((s) => s.counts);
  const router = useRouter();

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.colors.bgApp }]}
      edges={["top", "left", "right"]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Decks</Text>
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
            accessibilityLabel="Create new deck"
            style={[styles.plus, { backgroundColor: theme.colors.accentPrimary }]}
            onPress={() => router.push("/deck/new")}
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
                onLongPress={() => {
                  showDeckMenu(item.name, (choice) => {
                    if (choice === "edit") router.push({ pathname: "/deck/[id]/edit", params: { id: item.id } });
                    else if (choice === "share") {
                      (async () => {
                        try {
                          const json = await exportDeck(
                            item.id,
                            useDecksStore.getState().decks,
                            useCardsStore.getState().cardsByDeck
                          );
                          await writeAndShare(json, `parchment-deck-${item.name}`);
                        } catch (e: unknown) {
                          Alert.alert("Couldn't share deck", e instanceof Error ? e.message : String(e));
                        }
                      })();
                    }
                    else if (choice === "delete") {
                      confirmDelete(item.name, () => {
                        useDecksStore.getState().delete(item.id).catch((e) => {
                          Alert.alert("Couldn't delete deck", e.message);
                        });
                      });
                    }
                  });
                }}
              />
            </View>
          )}
        />
      )}
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
