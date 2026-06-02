import React from "react";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDecksStore } from "@/store/decksStore";
import { useTheme } from "@/theme/ThemeProvider";
import { DeckEditor, type DeckEditorValues } from "@/components/DeckEditor";

export default function NewDeckScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const create = useDecksStore((s) => s.create);

  const handleSubmit = async (values: DeckEditorValues) => {
    await create(values);
    router.back();
  };

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={{ flex: 1, backgroundColor: theme.colors.bgApp }}
    >
      <Stack.Screen options={{ title: "New deck" }} />
      <DeckEditor
        initial={{ name: "", emoji: null, description: null, coverImage: null }}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />
    </SafeAreaView>
  );
}
