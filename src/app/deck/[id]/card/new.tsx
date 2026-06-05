import React, { useState } from "react";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCardsStore } from "@/store/cardsStore";
import { useTheme } from "@/theme/ThemeProvider";
import { CardEditor, type CardEditorValues } from "@/components/CardEditor";
import { useUnsavedChangesGuard } from "@/lib/useUnsavedChangesGuard";
import { PaperBackground } from "@/components/PaperBackground";

export default function NewCardScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const create = useCardsStore((s) => s.create);
  const [dirty, setDirty] = useState(false);
  const { skipOnce } = useUnsavedChangesGuard(dirty);

  const handleSubmit = async (values: CardEditorValues) => {
    if (!id) return;
    await create(id, values);
    skipOnce();
    router.back();
  };

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={{ flex: 1, backgroundColor: theme.colors.bgApp }}>
      <Stack.Screen options={{ title: "New card" }} />
      <PaperBackground seed={0x2af913} />
      <CardEditor
        initial={{ frontText: "", frontImages: [], backText: "", backImages: [] }}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        onDirtyChange={setDirty}
      />
    </SafeAreaView>
  );
}
