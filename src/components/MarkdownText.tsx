import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF } from "@/theme/fonts";
import Markdown from "react-native-marked";

interface Props {
  children: string;
  /** When true, paragraph / heading / list body text is centred —
   *  used by the study session's card faces for the trading-card
   *  layout. Default false (left-aligned) for editor previews and
   *  anywhere else that wants conventional reading flow. */
  centered?: boolean;
}

export function MarkdownText({ children, centered }: Props) {
  const { theme } = useTheme();
  if (!children || children.trim().length === 0) {
    return (
      <Text
        style={[
          styles.empty,
          { color: theme.colors.textMuted, textAlign: centered ? "center" : "left" },
        ]}
      >
        (empty)
      </Text>
    );
  }
  // Per-element style overrides for centred mode. react-native-marked
  // splits its styles into ViewStyle (paragraph, list, blockquote)
  // and TextStyle (text, h1-h6, em, strong, …) groups, so textAlign
  // lives on the text-typed keys while the layout-typed `paragraph`
  // gets alignItems/justifyContent to centre the inner Text node
  // within its row.
  const centeredStyles = centered
    ? {
        paragraph: { alignItems: "center" as const, justifyContent: "center" as const },
        text: { textAlign: "center" as const },
        h1: { textAlign: "center" as const },
        h2: { textAlign: "center" as const },
        h3: { textAlign: "center" as const },
        h4: { textAlign: "center" as const },
        h5: { textAlign: "center" as const },
        h6: { textAlign: "center" as const },
        em: { textAlign: "center" as const },
        strong: { textAlign: "center" as const },
        li: { textAlign: "center" as const },
      }
    : undefined;
  try {
    return (
      <View style={centered ? styles.centerWrap : undefined}>
        <Markdown
          value={children}
          flatListProps={{
            initialNumToRender: 8,
            style: { backgroundColor: "transparent" },
          }}
          styles={centeredStyles}
          theme={{
            colors: {
              background: "transparent",
              code: theme.colors.bgApp,
              link: theme.colors.accentPrimary,
              text: theme.colors.textBody,
              border: theme.colors.accentSoft,
            },
          }}
        />
      </View>
    );
  } catch {
    return (
      <Text
        style={[
          styles.fallback,
          { color: theme.colors.textBody, textAlign: centered ? "center" : "left" },
        ]}
      >
        {children}
      </Text>
    );
  }
}

const styles = StyleSheet.create({
  empty: {
    fontFamily: FONT_SERIF,
    fontStyle: "italic",
    fontSize: 14,
  },
  fallback: {
    fontFamily: FONT_SERIF,
    fontSize: 16,
  },
  // Centred mode: the wrapper itself centres horizontally so the
  // FlatList rendered inside react-native-marked doesn't stretch
  // edge-to-edge and pull the text alignment left.
  centerWrap: {
    alignItems: "center",
    alignSelf: "stretch",
  },
});
