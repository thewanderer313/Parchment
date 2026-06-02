import React from "react";
import { View, Text, Pressable, StyleSheet, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useDecksStore } from "@/store/decksStore";
import { useTheme } from "@/theme/ThemeProvider";
import { EmptyDeckList } from "@/components/EmptyDeckList";
import { DeckTile } from "@/components/DeckTile";
import { FONT_SERIF } from "@/theme/fonts";

export default function Home() {
  const { theme } = useTheme();
  const decks = useDecksStore((s) => s.decks);
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create new deck"
          style={[styles.plus, { backgroundColor: theme.colors.accentPrimary }]}
          onPress={() => router.push("/deck/new")}
        >
          <Text style={[styles.plusGlyph, { color: theme.colors.bgCard }]}>+</Text>
        </Pressable>
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
                cardCount={0}
                // /deck/[id] index route is owned by Plan 02b (Deck Detail).
                // Cast unblocks the type-check until that route file exists.
                onPress={() => router.push(`/deck/${item.id}` as never)}
                onLongPress={() => { /* long-press menu added in Task 11 */ }}
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
});
