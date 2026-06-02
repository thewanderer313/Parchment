import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import Constants from "expo-constants";
import { useTheme } from "@/theme/ThemeProvider";
import { useSettingsStore } from "@/store/settingsStore";
import { useDecksStore } from "@/store/decksStore";
import { useCardsStore } from "@/store/cardsStore";
import { FONT_SERIF } from "@/theme/fonts";
import { THEME_SELECTIONS, type ThemeSelection } from "@/theme/palette";
import { exportLibrary } from "@/lib/export";
import { parseAndPlanImport, applyImport, type ResolveDecision, type ImportPlanEntry } from "@/lib/import";
import { writeAndShare, pickImportFile } from "@/lib/share";

export default function SettingsScreen() {
  const { theme } = useTheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const [busy, setBusy] = useState(false);

  const onExport = async () => {
    setBusy(true);
    try {
      const json = await exportLibrary(
        useDecksStore.getState().decks,
        useCardsStore.getState().cardsByDeck
      );
      await writeAndShare(json, "parchment-library");
    } catch (e: unknown) {
      Alert.alert("Couldn't export", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const resolveCollisions = (entries: ImportPlanEntry[]): Promise<Record<string, ResolveDecision>> => {
    return new Promise((resolve) => {
      const decisions: Record<string, ResolveDecision> = {};
      const askNext = (i: number) => {
        if (i >= entries.length) return resolve(decisions);
        const e = entries[i];
        if (!e.collision) {
          decisions[e.deck.id] = "keep";
          askNext(i + 1);
          return;
        }
        Alert.alert(
          `Deck "${e.existingName}" already exists`,
          `What should we do with the imported "${e.deck.name}"?`,
          [
            { text: "Skip", onPress: () => { decisions[e.deck.id] = "skip"; askNext(i + 1); } },
            { text: "Keep both", onPress: () => { decisions[e.deck.id] = "keep"; askNext(i + 1); } },
            { text: "Replace", style: "destructive", onPress: () => { decisions[e.deck.id] = "replace"; askNext(i + 1); } },
          ]
        );
      };
      askNext(0);
    });
  };

  const onImport = async () => {
    setBusy(true);
    try {
      const body = await pickImportFile();
      if (!body) return;
      const plan = parseAndPlanImport(body, useDecksStore.getState().decks);
      const decisions = await resolveCollisions(plan.entries);
      await applyImport(plan.entries, decisions);
      await useDecksStore.getState().load();
      await useCardsStore.getState().loadCounts();
      const imported = plan.entries.filter((e) => decisions[e.deck.id] !== "skip").length;
      Alert.alert("Import complete", `Imported ${imported} deck(s).`);
    } catch (e: unknown) {
      Alert.alert("Couldn't import", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bgApp }]} edges={["top", "left", "right"]}>
      <Stack.Screen options={{ title: "Settings" }} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Theme</Text>
        <View style={[styles.segment, { borderColor: theme.colors.accentSoft }]}>
          {THEME_SELECTIONS.map((mode: ThemeSelection) => (
            <Pressable
              key={mode}
              onPress={() => setThemeMode(mode)}
              style={[
                styles.segmentItem,
                themeMode === mode && { backgroundColor: theme.colors.accentPrimary },
              ]}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  { color: themeMode === mode ? theme.colors.bgCard : theme.colors.textBody },
                ]}
              >
                {mode === "system" ? "System" : mode === "light" ? "Light" : "Dark"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Library</Text>
        <Pressable
          onPress={onExport}
          disabled={busy}
          style={[styles.btn, { borderColor: theme.colors.accentSoft, opacity: busy ? 0.5 : 1 }]}
        >
          <Text style={[styles.btnLabel, { color: theme.colors.textBody }]}>Export library…</Text>
          <Text style={[styles.btnSub, { color: theme.colors.textMuted }]}>Save or share a .parchment file with all your decks.</Text>
        </Pressable>
        <Pressable
          onPress={onImport}
          disabled={busy}
          style={[styles.btn, { borderColor: theme.colors.accentSoft, opacity: busy ? 0.5 : 1 }]}
        >
          <Text style={[styles.btnLabel, { color: theme.colors.textBody }]}>Import library…</Text>
          <Text style={[styles.btnSub, { color: theme.colors.textMuted }]}>Read a .parchment file and add its decks.</Text>
        </Pressable>

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>About</Text>
        <Text style={[styles.aboutLine, { color: theme.colors.textBody }]}>
          Parchment v{Constants.expoConfig?.version ?? "0.1.0"}
        </Text>
        <Text style={[styles.aboutLine, { color: theme.colors.textMuted, fontStyle: "italic" }]}>
          Made for quiet studying.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { padding: 20, gap: 4 },
  label: {
    fontFamily: FONT_SERIF, fontSize: 12, fontStyle: "italic",
    marginTop: 16, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5,
  },
  segment: { flexDirection: "row", borderWidth: 1, borderRadius: 999, padding: 4, gap: 4 },
  segmentItem: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 999 },
  segmentLabel: { fontFamily: FONT_SERIF, fontSize: 14, fontWeight: "600" },
  btn: {
    borderWidth: 1, borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 16,
    marginTop: 6,
  },
  btnLabel: { fontFamily: FONT_SERIF, fontSize: 15, fontWeight: "600" },
  btnSub: { fontFamily: FONT_SERIF, fontSize: 12, fontStyle: "italic", marginTop: 4 },
  aboutLine: { fontFamily: FONT_SERIF, fontSize: 14, marginTop: 2 },
});
