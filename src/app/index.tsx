import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useDecksStore } from "@/store/decksStore";
import { useTheme } from "@/theme/ThemeProvider";
import { EmptyDeckList } from "@/components/EmptyDeckList";
import { FONT_SERIF } from "@/theme/fonts";

export default function Home() {
  const { theme } = useTheme();
  const decks = useDecksStore((s) => s.decks);

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
          onPress={() => { /* deck creation wired up in Plan 2 */ }}
        >
          <Text style={[styles.plusGlyph, { color: theme.colors.bgCard }]}>+</Text>
        </Pressable>
      </View>

      {decks.length === 0 ? (
        <EmptyDeckList />
      ) : (
        <View style={styles.placeholder}>
          <Text style={{ color: theme.colors.textBody, fontFamily: FONT_SERIF, fontStyle: "italic" }}>
            Deck grid arrives in Plan 2.
          </Text>
        </View>
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
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center" },
});
