import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, Image,
} from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF, FONT_DISPLAY, FONT_DISPLAY_ITALIC } from "@/theme/fonts";
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
  onDirtyChange?: (dirty: boolean) => void;
}

type Side = "front" | "back";

function arrayEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

// Card composition screen — same editorial chrome as the rest of the
// app. Front/Back as small-caps tabs in display serif, hairline-
// bordered editor surface and preview frame, section labels with the
// editorial rule treatment from Settings, primary CTA in display
// serif. No structural changes to the prop API or markdown insertion
// logic — only visual polish.
export function CardEditor({ initial, onSubmit, onCancel, onDirtyChange }: Props) {
  const { theme } = useTheme();
  const [active, setActive] = useState<Side>("front");
  const [frontText, setFrontText] = useState(initial.frontText);
  const [frontImages, setFrontImages] = useState<string[]>(initial.frontImages);
  const [backText, setBackText] = useState(initial.backText);
  const [backImages, setBackImages] = useState<string[]>(initial.backImages);
  const [picking, setPicking] = useState(false);
  // Per-side selection (cursor position). Used by the toolbar so insertions
  // land where the user is typing rather than at the end of the field.
  const [frontSel, setFrontSel] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const [backSel, setBackSel] = useState<{ start: number; end: number }>({ start: 0, end: 0 });

  const isDirty = useMemo(
    () =>
      frontText !== initial.frontText ||
      backText !== initial.backText ||
      !arrayEqual(frontImages, initial.frontImages) ||
      !arrayEqual(backImages, initial.backImages),
    [frontText, frontImages, backText, backImages, initial]
  );

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const text = active === "front" ? frontText : backText;
  const setText = active === "front" ? setFrontText : setBackText;
  const images = active === "front" ? frontImages : backImages;
  const setImages = active === "front" ? setFrontImages : setBackImages;
  const selection = active === "front" ? frontSel : backSel;
  const setSelection = active === "front" ? setFrontSel : setBackSel;

  const chooseImage = async () => {
    setPicking(true);
    try {
      const picked = await pickAndStoreImage("card");
      if (picked) setImages([picked.path]);
    } finally {
      setPicking(false);
    }
  };

  /**
   * Insert markdown syntax at the current cursor, wrapping the selected
   * text (or a "text" placeholder) when `wrapClose` is provided. When
   * `blockLine` is true, the open string is treated as a line-prefix and
   * we prepend a newline if the cursor isn't already at the start of one.
   * After insertion the selection collapses to just after the placeholder
   * so the next keystroke continues editing the new text.
   */
  const insertAt = (open: string, wrapClose: string = "", blockLine: boolean = false) => {
    const before = text.substring(0, selection.start);
    const selected = text.substring(selection.start, selection.end);
    const after = text.substring(selection.end);
    const placeholder = selected.length > 0 ? selected : (wrapClose || blockLine ? "text" : "");
    const linePrefix = blockLine && before.length > 0 && !before.endsWith("\n") ? "\n" : "";
    const inserted = linePrefix + open + placeholder + wrapClose;
    const newText = before + inserted + after;
    setText(newText);
    // Drop the cursor right after the placeholder text — feels natural
    // because the user usually wants to keep typing inside the wrapper.
    const newCursor =
      before.length + linePrefix.length + open.length + placeholder.length;
    setSelection({ start: newCursor, end: newCursor });
  };

  const submit = () => {
    onSubmit({ frontText, frontImages, backText, backImages });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Front / Back tabs — small-caps display serif with a hairline
          rule under the row and a 1.5 px accent underline on the
          active tab. Reads as an editorial section switch rather
          than a generic segmented control. */}
      <View style={[styles.tabs, { borderBottomColor: theme.colors.accentSoft }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setActive("front")}
          style={[
            styles.tab,
            active === "front" && {
              borderBottomColor: theme.colors.accentPrimary,
              borderBottomWidth: 1.5,
            },
          ]}
        >
          <Text
            style={[
              styles.tabLabel,
              { color: active === "front" ? theme.colors.textPrimary : theme.colors.textMuted },
            ]}
          >
            Front
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setActive("back")}
          style={[
            styles.tab,
            active === "back" && {
              borderBottomColor: theme.colors.accentPrimary,
              borderBottomWidth: 1.5,
            },
          ]}
        >
          <Text
            style={[
              styles.tabLabel,
              { color: active === "back" ? theme.colors.textPrimary : theme.colors.textMuted },
            ]}
          >
            Back
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* Markdown toolbar — hairline-bordered strip with the seven
            wrapping/inserting buttons. Labels use display serif for
            the alphabetic glyphs (B/I/H) so they sit consistently
            with the rest of the chrome; symbol glyphs (•/1./</>/🔗)
            stay as-is since the characters do the visual work. */}
        <View
          style={[
            styles.toolbar,
            {
              borderColor: theme.colors.accentSoft,
              backgroundColor: theme.colors.bgCard,
            },
          ]}
        >
          <Pressable accessibilityLabel="Bold" onPress={() => insertAt("**", "**")} style={styles.toolBtn}>
            <Text style={[styles.toolLabel, { fontFamily: FONT_DISPLAY, color: theme.colors.textBody }]}>B</Text>
          </Pressable>
          <Pressable accessibilityLabel="Italic" onPress={() => insertAt("*", "*")} style={styles.toolBtn}>
            <Text style={[styles.toolLabel, { fontFamily: FONT_DISPLAY_ITALIC, color: theme.colors.textBody }]}>I</Text>
          </Pressable>
          <Pressable accessibilityLabel="Heading" onPress={() => insertAt("# ", "", true)} style={styles.toolBtn}>
            <Text style={[styles.toolLabel, { fontFamily: FONT_DISPLAY, color: theme.colors.textBody }]}>H</Text>
          </Pressable>
          <Pressable accessibilityLabel="Bullet list" onPress={() => insertAt("- ", "", true)} style={styles.toolBtn}>
            <Text style={[styles.toolLabel, { color: theme.colors.textBody, fontSize: 17 }]}>•</Text>
          </Pressable>
          <Pressable accessibilityLabel="Numbered list" onPress={() => insertAt("1. ", "", true)} style={styles.toolBtn}>
            <Text style={[styles.toolLabel, { fontFamily: FONT_DISPLAY_ITALIC, color: theme.colors.textBody, fontSize: 13 }]}>1.</Text>
          </Pressable>
          <Pressable accessibilityLabel="Inline code" onPress={() => insertAt("`", "`")} style={styles.toolBtn}>
            <Text style={[styles.toolLabel, { fontFamily: Platform.select({ ios: "Courier", android: "monospace" }), color: theme.colors.textBody, fontSize: 13 }]}>{"</>"}</Text>
          </Pressable>
          <Pressable accessibilityLabel="Link" onPress={() => insertAt("[", "](https://)")} style={styles.toolBtn}>
            <Text style={[styles.toolLabel, { color: theme.colors.textBody, fontSize: 14 }]}>🔗</Text>
          </Pressable>
        </View>

        <TextInput
          value={text}
          onChangeText={setText}
          selection={selection}
          onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
          placeholder={`${active === "front" ? "Front" : "Back"} markdown…`}
          placeholderTextColor={theme.colors.textMuted}
          multiline
          style={[
            styles.input,
            {
              color: theme.colors.textPrimary,
              backgroundColor: theme.colors.bgCard,
              borderColor: theme.colors.accentSoft,
            },
          ]}
        />

        <Text
          style={[
            styles.label,
            { color: theme.colors.textMuted, borderBottomColor: theme.colors.accentSoft },
          ]}
        >
          Preview
        </Text>
        <View style={[styles.preview, { backgroundColor: theme.colors.bgCard, borderColor: theme.colors.accentSoft }]}>
          <MarkdownText>{text}</MarkdownText>
        </View>

        <Text
          style={[
            styles.label,
            { color: theme.colors.textMuted, borderBottomColor: theme.colors.accentSoft },
          ]}
        >
          Image
        </Text>
        {images[0] ? (
          <View style={{ gap: 12 }}>
            <View style={[styles.imageFrame, { borderColor: theme.colors.accentSoft, backgroundColor: theme.colors.bgCard }]}>
              <Image source={{ uri: images[0] }} style={styles.imagePreview} resizeMode="cover" />
            </View>
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
  tabs: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    // borderBottomWidth/Color are conditionally applied inline on the
    // active tab — leaving them off the base style keeps the inactive
    // row visually clean (no gap reserved for the underline).
  },
  tabLabel: {
    fontFamily: FONT_DISPLAY,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 2.5,
  },
  body: { padding: 18, gap: 4 },
  // Hairline-bordered toolbar; flexWrap so the seven buttons fall to a
  // second row gracefully on narrower phones.
  toolbar: {
    flexDirection: "row",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 6,
    gap: 4,
    flexWrap: "wrap",
    alignSelf: "stretch",
    marginBottom: 10,
  },
  toolBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    minWidth: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  toolLabel: { fontSize: 15 },
  input: {
    fontFamily: FONT_SERIF,
    fontSize: 16,
    lineHeight: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 140,
    textAlignVertical: "top",
  },
  // Editorial section label — display serif small caps with a
  // hairline rule under, matching the Settings section breaks.
  label: {
    fontFamily: FONT_DISPLAY,
    fontSize: 11,
    marginTop: 22,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 2.5,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  preview: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    minHeight: 90,
  },
  // Manuscript-style frame around the image preview — hairline border
  // in accentSoft so it reads as a folio rather than a raw photo.
  imageFrame: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    overflow: "hidden",
  },
  imagePreview: { width: "100%", aspectRatio: 16 / 9 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 24 },
  btnGhost: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: "flex-start",
  },
  btnGhostLabel: {
    fontFamily: FONT_DISPLAY,
    fontSize: 14,
    letterSpacing: 0.2,
  },
  btnPrimary: {
    paddingHorizontal: 26,
    paddingVertical: 11,
    borderRadius: 999,
  },
  btnPrimaryLabel: {
    fontFamily: FONT_DISPLAY,
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
