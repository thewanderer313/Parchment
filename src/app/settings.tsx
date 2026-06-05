import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, ScrollView, Modal, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import Constants from "expo-constants";
import { useTheme } from "@/theme/ThemeProvider";
import { useSettingsStore } from "@/store/settingsStore";
import { useDecksStore } from "@/store/decksStore";
import { useCardsStore } from "@/store/cardsStore";
import { FONT_SERIF, FONT_DISPLAY, FONT_DISPLAY_ITALIC } from "@/theme/fonts";
import { THEME_SELECTIONS, type ThemeSelection } from "@/theme/palette";
import { exportLibrary } from "@/lib/export";
import { writeAndShare } from "@/lib/share";
import { useDeckImport } from "@/lib/useDeckImport";
import { PasteImportModal } from "@/components/PasteImportModal";
import { PaperBackground } from "@/components/PaperBackground";

export default function SettingsScreen() {
  const { theme } = useTheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const [exporting, setExporting] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  // Title page viewer — opens the splash image as a full-screen modal
  // so the user can dwell on it whenever they want, not just at app
  // launch. Tap anywhere to dismiss.
  const [titlePageOpen, setTitlePageOpen] = useState(false);
  const { busy: importing, importFromFile, importFromText } = useDeckImport();
  const busy = exporting || importing;

  const onExport = async () => {
    setExporting(true);
    try {
      const json = await exportLibrary(
        useDecksStore.getState().decks,
        useCardsStore.getState().cardsByDeck
      );
      await writeAndShare(json, "parchment-library");
    } catch (e: unknown) {
      Alert.alert("Couldn't export", e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bgApp }]} edges={["top", "left", "right"]}>
      <Stack.Screen options={{ title: "Settings" }} />
      <PaperBackground seed={0x88ba17} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[styles.label, { color: theme.colors.textMuted, borderBottomColor: theme.colors.accentSoft }]}>Theme</Text>
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

        <Text style={[styles.label, { color: theme.colors.textMuted, borderBottomColor: theme.colors.accentSoft }]}>Library</Text>
        <Pressable
          onPress={onExport}
          disabled={busy}
          style={[styles.btn, { borderColor: theme.colors.accentSoft, opacity: busy ? 0.5 : 1 }]}
        >
          <Text style={[styles.btnLabel, { color: theme.colors.textBody }]}>Export library…</Text>
          <Text style={[styles.btnSub, { color: theme.colors.textMuted }]}>Save or share a .json file with all your decks.</Text>
        </Pressable>
        <Pressable
          onPress={importFromFile}
          disabled={busy}
          style={[styles.btn, { borderColor: theme.colors.accentSoft, opacity: busy ? 0.5 : 1 }]}
        >
          <Text style={[styles.btnLabel, { color: theme.colors.textBody }]}>Import deck from file…</Text>
          <Text style={[styles.btnSub, { color: theme.colors.textMuted }]}>Pick a .json export saved on your device.</Text>
        </Pressable>
        <Pressable
          onPress={() => setPasteOpen(true)}
          disabled={busy}
          style={[styles.btn, { borderColor: theme.colors.accentSoft, opacity: busy ? 0.5 : 1 }]}
        >
          <Text style={[styles.btnLabel, { color: theme.colors.textBody }]}>Import deck from text…</Text>
          <Text style={[styles.btnSub, { color: theme.colors.textMuted }]}>Paste the contents of a .json file (no file picker needed).</Text>
        </Pressable>

        <Text style={[styles.label, { color: theme.colors.textMuted, borderBottomColor: theme.colors.accentSoft }]}>About</Text>
        <Pressable
          onPress={() => setTitlePageOpen(true)}
          style={[styles.btn, { borderColor: theme.colors.accentSoft }]}
        >
          <Text style={[styles.btnLabel, { color: theme.colors.textBody }]}>View title page</Text>
          <Text style={[styles.btnSub, { color: theme.colors.textMuted }]}>Sit with the splash art for a moment.</Text>
        </Pressable>
        <Text style={[styles.wordmark, { color: theme.colors.textPrimary }]}>
          Parchment
        </Text>
        <Text style={[styles.aboutLine, { color: theme.colors.textMuted }]}>
          v{Constants.expoConfig?.version ?? "0.1.0"}
        </Text>
        <Text style={[styles.flavor, { color: theme.colors.textMuted }]}>
          Made for quiet studying.
        </Text>
      </ScrollView>

      <PasteImportModal
        visible={pasteOpen}
        busy={importing}
        onClose={() => setPasteOpen(false)}
        onImport={importFromText}
      />

      {/* Title page viewer modal. Full-screen splash art with the
          single dismiss interaction being "tap anywhere." The
          backgroundColor matches the splash image's corners so
          there's no flash of the wrong colour while the modal slides
          in. */}
      <Modal
        visible={titlePageOpen}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setTitlePageOpen(false)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close title page"
          onPress={() => setTitlePageOpen(false)}
          style={styles.titlePageBackdrop}
        >
          <Image
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            source={require("../../assets/images/splashscreen.png")}
            style={styles.titlePageImage}
            resizeMode="cover"
          />
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { padding: 20, gap: 4 },
  label: {
    fontFamily: FONT_DISPLAY, fontSize: 11,
    marginTop: 26, marginBottom: 12,
    textTransform: "uppercase", letterSpacing: 2.5,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  wordmark: {
    fontFamily: FONT_DISPLAY,
    fontSize: 26,
    letterSpacing: 0.4,
    marginTop: 4,
  },
  aboutLine: { fontFamily: FONT_SERIF, fontSize: 13, marginTop: 2 },
  flavor: {
    fontFamily: FONT_DISPLAY_ITALIC,
    fontSize: 14,
    marginTop: 8,
  },
  titlePageBackdrop: {
    flex: 1,
    backgroundColor: "#190901",
  },
  titlePageImage: {
    width: "100%",
    height: "100%",
  },
});
