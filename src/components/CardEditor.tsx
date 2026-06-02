import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, Image,
} from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF } from "@/theme/fonts";
import { pickAndStoreImage } from "@/lib/image";
import { MarkdownText } from "./MarkdownText";

export interface CardEditorValues {
  frontText: string;
  frontImages: string[];
  backText: string;
  backImages: string[];
}

interface Props {
  initial: CardEditorValues;
  onSubmit: (values: CardEditorValues) => void;
  onCancel: () => void;
}

type Side = "front" | "back";

export function CardEditor({ initial, onSubmit, onCancel }: Props) {
  const { theme } = useTheme();
  const [active, setActive] = useState<Side>("front");
  const [frontText, setFrontText] = useState(initial.frontText);
  const [frontImages, setFrontImages] = useState<string[]>(initial.frontImages);
  const [backText, setBackText] = useState(initial.backText);
  const [backImages, setBackImages] = useState<string[]>(initial.backImages);
  const [picking, setPicking] = useState(false);

  const text = active === "front" ? frontText : backText;
  const setText = active === "front" ? setFrontText : setBackText;
  const images = active === "front" ? frontImages : backImages;
  const setImages = active === "front" ? setFrontImages : setBackImages;

  const chooseImage = async () => {
    setPicking(true);
    try {
      const picked = await pickAndStoreImage("card");
      if (picked) setImages([picked.path]);
    } finally {
      setPicking(false);
    }
  };

  const insertSyntax = (open: string, close: string = open) => {
    setText(text + open + "text" + close);
  };

  const submit = () => {
    onSubmit({ frontText, frontImages, backText, backImages });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.tabs, { borderColor: theme.colors.accentSoft }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setActive("front")}
          style={[styles.tab, active === "front" && { borderBottomColor: theme.colors.accentPrimary, borderBottomWidth: 2 }]}
        >
          <Text style={[styles.tabLabel, { color: active === "front" ? theme.colors.textPrimary : theme.colors.textMuted }]}>Front</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setActive("back")}
          style={[styles.tab, active === "back" && { borderBottomColor: theme.colors.accentPrimary, borderBottomWidth: 2 }]}
        >
          <Text style={[styles.tabLabel, { color: active === "back" ? theme.colors.textPrimary : theme.colors.textMuted }]}>Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={[styles.toolbar, { borderColor: theme.colors.accentSoft }]}>
          <Pressable onPress={() => insertSyntax("**")} style={styles.toolBtn}><Text style={{ fontWeight: "700", color: theme.colors.textBody }}>B</Text></Pressable>
          <Pressable onPress={() => insertSyntax("*")} style={styles.toolBtn}><Text style={{ fontStyle: "italic", color: theme.colors.textBody }}>I</Text></Pressable>
          <Pressable onPress={() => insertSyntax("- ", "")} style={styles.toolBtn}><Text style={{ color: theme.colors.textBody }}>•</Text></Pressable>
          <Pressable onPress={() => insertSyntax("`")} style={styles.toolBtn}><Text style={{ fontFamily: "Courier", color: theme.colors.textBody }}>{"</>"}</Text></Pressable>
        </View>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={`${active === "front" ? "Front" : "Back"} markdown…`}
          placeholderTextColor={theme.colors.textMuted}
          multiline
          style={[styles.input, { color: theme.colors.textPrimary, backgroundColor: theme.colors.bgCard, borderColor: theme.colors.accentSoft }]}
        />

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Preview</Text>
        <View style={[styles.preview, { backgroundColor: theme.colors.bgCard, borderColor: theme.colors.accentSoft }]}>
          <MarkdownText>{text}</MarkdownText>
        </View>

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Image</Text>
        {images[0] ? (
          <View style={{ gap: 10 }}>
            <Image source={{ uri: images[0] }} style={styles.imagePreview} resizeMode="cover" />
            <Pressable onPress={() => setImages([])} style={[styles.btnGhost, { borderColor: theme.colors.accentSoft }]}>
              <Text style={[styles.btnGhostLabel, { color: theme.colors.textBody }]}>Remove image</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={chooseImage}
            disabled={picking}
            style={[styles.btnGhost, { borderColor: theme.colors.accentSoft, opacity: picking ? 0.5 : 1 }]}
          >
            <Text style={[styles.btnGhostLabel, { color: theme.colors.textBody }]}>
              {picking ? "Picking…" : "Choose image"}
            </Text>
          </Pressable>
        )}

        <View style={styles.actions}>
          <Pressable onPress={onCancel} style={[styles.btnGhost, { borderColor: theme.colors.accentSoft }]}>
            <Text style={[styles.btnGhostLabel, { color: theme.colors.textBody }]}>Cancel</Text>
          </Pressable>
          <Pressable onPress={submit} style={[styles.btnPrimary, { backgroundColor: theme.colors.accentPrimary }]}>
            <Text style={[styles.btnPrimaryLabel, { color: theme.colors.bgCard }]}>Save</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: 16 },
  tab: { paddingVertical: 12, paddingHorizontal: 18 },
  tabLabel: { fontFamily: FONT_SERIF, fontSize: 14, fontWeight: "600" },
  body: { padding: 16, gap: 4 },
  toolbar: { flexDirection: "row", borderWidth: 1, borderRadius: 8, padding: 4, gap: 4, alignSelf: "flex-start", marginBottom: 6 },
  toolBtn: { paddingVertical: 4, paddingHorizontal: 10, minWidth: 32, alignItems: "center" },
  input: {
    fontFamily: FONT_SERIF, fontSize: 16,
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    minHeight: 120, textAlignVertical: "top",
  },
  label: {
    fontFamily: FONT_SERIF, fontSize: 12, fontStyle: "italic",
    marginTop: 14, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5,
  },
  preview: { borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 80 },
  imagePreview: { width: "100%", aspectRatio: 16 / 9, borderRadius: 10 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 20 },
  btnGhost: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, borderWidth: 1, alignSelf: "flex-start" },
  btnGhostLabel: { fontFamily: FONT_SERIF, fontSize: 14, fontWeight: "600" },
  btnPrimary: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 999 },
  btnPrimaryLabel: { fontFamily: FONT_SERIF, fontSize: 14, fontWeight: "600" },
});
