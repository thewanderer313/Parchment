import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  TextInput,
} from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF, FONT_DISPLAY, FONT_DISPLAY_ITALIC } from "@/theme/fonts";
import { Ornament } from "@/components/Ornament";
import type { Card } from "@/store/cardsStore";

interface Props {
  visible: boolean;
  cards: Card[];
  /** Index in `cards` of the card currently being studied; highlighted
   *  in the list so the user can see where they are. */
  currentIndex: number;
  onClose: () => void;
  /** Called when the user taps a row — receives the new index into
   *  `cards`. The caller is expected to update study position and
   *  dismiss the modal. */
  onJump: (index: number) => void;
}

// Card-index panel for Study mode. Opens from the ≡ icon in the
// study top bar. Lets the user filter the deck by text and tap any
// card to jump directly to it without backing out to Deck Detail.
// Designed for decks in the 100–500-card range where swipe-by-swipe
// navigation becomes tedious.
export function CardJumpModal({
  visible,
  cards,
  currentIndex,
  onClose,
  onJump,
}: Props) {
  const { theme } = useTheme();
  const [query, setQuery] = useState("");

  // Reset the filter every time the modal opens so it doesn't carry
  // a stale query from a previous session.
  React.useEffect(() => {
    if (visible) setQuery("");
  }, [visible]);

  // Filter is local & synchronous — no debounce — because the data
  // set is already in memory and filtering 500 short strings per
  // keystroke is essentially free. Match is case-insensitive across
  // front and back text.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const indexed = cards.map((c, i) => ({ card: c, position: i }));
    if (q.length === 0) return indexed;
    return indexed.filter(
      ({ card }) =>
        card.frontText.toLowerCase().includes(q) ||
        card.backText.toLowerCase().includes(q)
    );
  }, [cards, query]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dim} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.colors.bgCard }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              Jump to card
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              hitSlop={8}
              style={styles.closeBtn}
            >
              <Text style={[styles.closeGlyph, { color: theme.colors.textMuted }]}>✕</Text>
            </Pressable>
          </View>
          <View style={{ width: 80, alignSelf: "center", marginBottom: 14 }}>
            <Ornament width={80} glyph="·" />
          </View>

          <TextInput
            accessibilityLabel="Filter cards"
            placeholder="Filter cards"
            placeholderTextColor={theme.colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            style={[
              styles.input,
              {
                color: theme.colors.textPrimary,
                borderColor: theme.colors.accentSoft,
                backgroundColor: theme.colors.bgApp,
              },
            ]}
          />

          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyCopy, { color: theme.colors.textMuted }]}>
                No cards match &quot;{query.trim()}&quot;.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(it) => it.card.id}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => (
                <View style={[styles.separator, { backgroundColor: theme.colors.accentSoft }]} />
              )}
              renderItem={({ item }) => {
                const isCurrent = item.position === currentIndex;
                const preview = (item.card.frontText.trim() || "(empty)").slice(0, 100);
                const isEmpty = item.card.frontText.trim().length === 0;
                return (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => onJump(item.position)}
                    style={({ pressed }) => [
                      styles.row,
                      isCurrent && {
                        backgroundColor: theme.colors.accentSoft,
                      },
                      pressed && !isCurrent && {
                        backgroundColor: theme.colors.accentSoft,
                        opacity: 0.7,
                      },
                    ]}
                  >
                    <Text style={[styles.numeral, { color: theme.colors.textMuted }]}>
                      {item.position + 1}.
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={[
                        styles.preview,
                        {
                          color: isEmpty ? theme.colors.textMuted : theme.colors.textPrimary,
                          fontStyle: isEmpty ? "italic" : "normal",
                          fontWeight: isCurrent ? "700" : "normal",
                        },
                      ]}
                    >
                      {preview}
                    </Text>
                    {isCurrent && (
                      <Text style={[styles.currentMark, { color: theme.colors.accentPrimary }]}>
                        ▸
                      </Text>
                    )}
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end" },
  dim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    maxHeight: "82%",
    minHeight: "60%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  title: {
    fontFamily: FONT_DISPLAY,
    fontSize: 22,
    letterSpacing: 0.2,
  },
  closeBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  closeGlyph: { fontSize: 18 },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    fontFamily: FONT_SERIF,
    fontSize: 15,
    marginBottom: 8,
  },
  list: { flex: 1 },
  listContent: { paddingBottom: 16 },
  separator: { height: StyleSheet.hairlineWidth, opacity: 0.6 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 12,
    borderRadius: 8,
  },
  numeral: {
    fontFamily: FONT_DISPLAY_ITALIC,
    fontSize: 14,
    minWidth: 36,
    textAlign: "right",
    opacity: 0.85,
  },
  preview: {
    flex: 1,
    fontFamily: FONT_SERIF,
    fontSize: 14,
  },
  currentMark: { fontSize: 16 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyCopy: {
    fontFamily: FONT_SERIF,
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
  },
});
