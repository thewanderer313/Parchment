import React from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF } from "@/theme/fonts";

export interface ActionSheetItem {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface Props {
  visible: boolean;
  title?: string;
  items: ActionSheetItem[];
  onClose: () => void;
}

/**
 * Bottom-anchored action sheet. We use this instead of Alert.alert because
 * Android's native Alert has a hard cap of 3 buttons; passing 4 (Cancel,
 * Edit, Share, Delete) silently drops the 4th. This custom sheet renders
 * any number of items consistently on iOS and Android with our palette.
 *
 * Tap an item or the backdrop to dismiss. The chosen item's onPress runs
 * after a short timeout so the Modal dismissal animation can complete
 * before the next navigation or alert appears.
 */
export function ActionSheet({ visible, title, items, onClose }: Props) {
  const { theme } = useTheme();

  const pick = (item: ActionSheetItem) => {
    onClose();
    // Defer so the Modal has time to dismiss before the next UI (e.g. a
    // confirm Alert or a router.push) takes over.
    setTimeout(() => item.onPress(), 80);
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* The two child groups are wrapped in a single View so they stack
            at the bottom. Pressable on the inner blocks stops bubbling to
            the backdrop. */}
        <Pressable style={styles.dock} onPress={() => { /* swallow */ }}>
          <View style={[styles.sheet, { backgroundColor: theme.colors.bgCard }]}>
            {title ? (
              <View style={[styles.titleWrap, { borderBottomColor: theme.colors.accentSoft }]}>
                <Text style={[styles.title, { color: theme.colors.textMuted }]} numberOfLines={1}>
                  {title}
                </Text>
              </View>
            ) : null}
            {items.map((item, i) => (
              <Pressable
                key={i}
                onPress={() => pick(item)}
                style={({ pressed }) => [
                  styles.item,
                  i > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.accentSoft },
                  pressed && { backgroundColor: theme.colors.accentSoft },
                ]}
              >
                <Text
                  style={[
                    styles.itemLabel,
                    {
                      color: item.destructive ? "#a82020" : theme.colors.textBody,
                      fontWeight: item.destructive ? "700" : "600",
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.cancelBtn,
              { backgroundColor: theme.colors.bgCard },
              pressed && { backgroundColor: theme.colors.accentSoft },
            ]}
          >
            <Text style={[styles.cancelLabel, { color: theme.colors.textBody }]}>
              Cancel
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  dock: {
    padding: 12,
    gap: 8,
  },
  sheet: {
    borderRadius: 14,
    overflow: "hidden",
  },
  titleWrap: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  title: {
    fontFamily: FONT_SERIF,
    fontSize: 13,
    fontStyle: "italic",
  },
  item: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  itemLabel: {
    fontFamily: FONT_SERIF,
    fontSize: 17,
  },
  cancelBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelLabel: {
    fontFamily: FONT_SERIF,
    fontSize: 17,
    fontWeight: "700",
  },
});
