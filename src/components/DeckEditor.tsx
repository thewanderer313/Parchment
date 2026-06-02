import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF } from "@/theme/fonts";

export interface DeckEditorValues {
  name: string;
  emoji: string | null;
  description: string | null;
  coverImage: string | null;
}

interface Props {
  initial: DeckEditorValues;
  onSubmit: (values: DeckEditorValues) => void;
  onCancel: () => void;
}

function trimToNull(s: string): string | null {
  const trimmed = s.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function DeckEditor({ initial, onSubmit, onCancel }: Props) {
  const { theme } = useTheme();
  const [name, setName] = useState(initial.name);
  const [emoji, setEmoji] = useState(initial.emoji ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [coverImage] = useState<string | null>(initial.coverImage);
  const [showNameError, setShowNameError] = useState(false);

  const submit = () => {
    if (name.trim().length === 0) {
      setShowNameError(true);
      return;
    }
    setShowNameError(false);
    onSubmit({
      name: name.trim(),
      emoji: trimToNull(emoji),
      description: trimToNull(description),
      coverImage,
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name"
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.accentSoft, backgroundColor: theme.colors.bgCard }]}
        />
        {showNameError && (
          <Text style={[styles.error, { color: theme.colors.accentPrimary }]}>
            Name is required
          </Text>
        )}

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Emoji</Text>
        <TextInput
          value={emoji}
          onChangeText={setEmoji}
          placeholder="Emoji"
          placeholderTextColor={theme.colors.textMuted}
          maxLength={4}
          style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.accentSoft, backgroundColor: theme.colors.bgCard }]}
        />

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Description"
          placeholderTextColor={theme.colors.textMuted}
          multiline
          numberOfLines={3}
          style={[styles.inputMulti, { color: theme.colors.textPrimary, borderColor: theme.colors.accentSoft, backgroundColor: theme.colors.bgCard }]}
        />

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            style={[styles.btnGhost, { borderColor: theme.colors.accentSoft }]}
          >
            <Text style={[styles.btnGhostLabel, { color: theme.colors.textBody }]}>Cancel</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={submit}
            style={[styles.btnPrimary, { backgroundColor: theme.colors.accentPrimary }]}
          >
            <Text style={[styles.btnPrimaryLabel, { color: theme.colors.bgCard }]}>Save</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 4 },
  label: {
    fontFamily: FONT_SERIF,
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 16,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    fontFamily: FONT_SERIF,
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputMulti: {
    fontFamily: FONT_SERIF,
    fontSize: 15,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 80,
    textAlignVertical: "top",
  },
  error: {
    fontFamily: FONT_SERIF,
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 6,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 24,
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
