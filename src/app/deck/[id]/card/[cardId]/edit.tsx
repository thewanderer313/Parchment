import React from "react";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View } from "react-native";
import { useCardsStore } from "@/store/cardsStore";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF } from "@/theme/fonts";
import { CardEditor, type CardEditorValues } from "@/components/CardEditor";

export default function EditCardScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id, cardId } = useLocalSearchParams<{ id: string; cardId: string }>();
  const card = useCardsStore((s) => s.cardsByDeck[id ?? ""]?.find((c) => c.id === cardId));
  const update = useCardsStore((s) => s.update);

  const handleSubmit = async (values: CardEditorValues) => {
    if (!card) return;
    await update(card.id, values);
    router.back();
  };

  if (!card) {
    return (
      <SafeAreaView
        edges={["bottom", "left", "right"]}
        style={{ flex: 1, backgroundColor: theme.colors.bgApp, alignItems: "center", justifyContent: "center", padding: 24 }}
      >
        <Stack.Screen options={{ title: "Edit card" }} />
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
      <CardEditor
        initial={{
          frontText: card.frontText, frontImages: card.frontImages,
          backText: card.backText, backImages: card.backImages,
        }}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />
    </SafeAreaView>
  );
}
