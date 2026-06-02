import React from "react";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View } from "react-native";
import { useDecksStore } from "@/store/decksStore";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF } from "@/theme/fonts";
import { DeckEditor, type DeckEditorValues } from "@/components/DeckEditor";

export default function EditDeckScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const deck = useDecksStore((s) => s.decks.find((d) => d.id === id));
  const update = useDecksStore((s) => s.update);

  const handleSubmit = async (values: DeckEditorValues) => {
    if (!deck) return;
    await update(deck.id, values);
    router.back();
  };

  if (!deck) {
    return (
      <SafeAreaView
        edges={["bottom", "left", "right"]}
        style={{ flex: 1, backgroundColor: theme.colors.bgApp, alignItems: "center", justifyContent: "center", padding: 24 }}
      >
        <Stack.Screen options={{ title: "Edit deck" }} />
        <View>
          <Text style={{ fontFamily: FONT_SERIF, fontSize: 16, fontStyle: "italic", color: theme.colors.textMuted }}>
            Deck not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={{ flex: 1, backgroundColor: theme.colors.bgApp }}
    >
      <Stack.Screen options={{ title: "Edit deck" }} />
      <DeckEditor
        initial={{
          name: deck.name,
          emoji: deck.emoji,
          description: deck.description,
          coverImage: deck.coverImage,
        }}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />
    </SafeAreaView>
  );
}
