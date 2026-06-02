import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF } from "@/theme/fonts";
import Markdown from "react-native-marked";

interface Props {
  children: string;
}

export function MarkdownText({ children }: Props) {
  const { theme } = useTheme();
  if (!children || children.trim().length === 0) {
    return (
      <Text style={[styles.empty, { color: theme.colors.textMuted }]}>
        (empty)
      </Text>
    );
  }
  try {
    return (
      <View>
        <Markdown
          value={children}
          flatListProps={{
            initialNumToRender: 8,
            style: { backgroundColor: "transparent" },
          }}
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
    return <Text style={[styles.fallback, { color: theme.colors.textBody }]}>{children}</Text>;
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
});
