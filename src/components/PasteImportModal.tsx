import React, { useState } from "react";
import {
  View, Text, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform, StyleSheet,
} from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF } from "@/theme/fonts";

interface Props {
  visible: boolean;
  busy: boolean;
  onClose: () => void;
  /** Returns true on success so the modal can dismiss + clear its text. */
  onImport: (text: string) => Promise<boolean>;
}

/**
 * Bottom-sheet Modal with a monospace TextInput for pasting JSON. Used
 * as the no-file-picker fallback for importing a deck. Both Settings and
 * Home render it; the caller owns visible/busy/onClose/onImport.
 */
export function PasteImportModal({ visible, busy, onClose, onImport }: Props) {
  const { theme } = useTheme();
  const [text, setText] = useState("");

  const handleImport = async () => {
    const ok = await onImport(text);
    if (ok) {
      setText("");
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <View style={[styles.sheet, { backgroundColor: theme.colors.bgCard }]}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            Paste deck JSON
          </Text>
          <Text style={[styles.sub, { color: theme.colors.textMuted }]}>
            Open the .json file in any text app (Files, Drive, the email body),
            copy the entire contents, paste below, and tap Import.
          </Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder='{"format":"parchment.v1", …}'
            placeholderTextColor={theme.colors.textMuted}
            multiline
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            style={[
              styles.input,
              {
                color: theme.colors.textPrimary,
                backgroundColor: theme.colors.bgApp,
                borderColor: theme.colors.accentSoft,
              },
            ]}
          />
          <View style={styles.actions}>
            <Pressable
              onPress={() => { setText(""); onClose(); }}
              disabled={busy}
              style={[styles.btnGhost, { borderColor: theme.colors.accentSoft }]}
            >
              <Text style={[styles.btnGhostLabel, { color: theme.colors.textBody }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleImport}
              disabled={busy}
              style={[
                styles.btnPrimary,
                { backgroundColor: theme.colors.accentPrimary, opacity: busy ? 0.5 : 1 },
              ]}
            >
              <Text style={[styles.btnPrimaryLabel, { color: theme.colors.bgCard }]}>
                {busy ? "Importing…" : "Import"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 22,
    paddingBottom: 28,
  },
  title: {
    fontFamily: FONT_SERIF,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  sub: {
    fontFamily: FONT_SERIF,
    fontSize: 13,
    fontStyle: "italic",
    marginBottom: 14,
    lineHeight: 18,
  },
  input: {
    fontFamily: "Courier",
    fontSize: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 180,
    maxHeight: 260,
    textAlignVertical: "top",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 14,
  },
  btnGhost: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  btnGhostLabel: {
    fontFamily: FONT_SERIF,
    fontSize: 14,
    fontWeight: "600",
  },
  btnPrimary: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
  },
  btnPrimaryLabel: {
    fontFamily: FONT_SERIF,
    fontSize: 14,
    fontWeight: "600",
  },
});
