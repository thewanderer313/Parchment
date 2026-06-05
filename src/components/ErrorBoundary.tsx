import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Appearance } from "react-native";

interface State {
  error: Error | null;
}

interface Props {
  children: React.ReactNode;
}

// Theme tokens duplicated locally rather than imported from
// theme/palette.ts so the boundary still renders correctly even if the
// failure was inside the theme system. Class components can't use the
// useTheme() hook anyway; reading Appearance.getColorScheme() at
// render time gives us system-mode tracking without needing the
// settings store either.
const TONES = {
  light: {
    bgApp: "#e8dec5",
    bgCard: "#f5ecd4",
    textPrimary: "#1f3024",
    textBody: "#2a3b2e",
    textMuted: "#4a6b48",
    accentPrimary: "#2f4a35",
    accentSoft: "#c9bf9f",
  },
  dark: {
    bgApp: "#1a1f1b",
    bgCard: "#252b26",
    textPrimary: "#f0e6cf",
    textBody: "#d8cfb8",
    textMuted: "#8aa37e",
    accentPrimary: "#7fb087",
    accentSoft: "#3a4438",
  },
} as const;

/**
 * Top-level error boundary. When a render-time error escapes one of our
 * screens, this surfaces the error name + message + stack on screen
 * instead of letting the app close silently. Production builds normally
 * swallow these to a blank crash; we want them visible.
 *
 * Renders in light or dark mode based on the system color scheme — does
 * not consult ThemeProvider or the settings store in case the failure
 * was in either of those.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Also surface to the JS console in case the user is on adb logcat.
    console.warn("[Parchment ErrorBoundary]", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const scheme = Appearance.getColorScheme() === "dark" ? "dark" : "light";
    const c = TONES[scheme];
    return (
      <View style={[styles.root, { backgroundColor: c.bgApp }]}>
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={[styles.title, { color: c.textPrimary }]}>Something broke</Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>
            Showing the error so we can diagnose. Tap "Try again" to recover.
          </Text>
          <Text style={[styles.errorName, { color: c.textPrimary }]}>{error.name}</Text>
          <Text style={[styles.errorMessage, { color: c.textBody }]}>{error.message}</Text>
          <Text style={[styles.label, { color: c.textMuted, borderBottomColor: c.accentSoft }]}>Stack</Text>
          <Text style={[styles.stack, { color: c.textBody }]}>{error.stack ?? "(no stack available)"}</Text>
          <Pressable onPress={this.reset} style={[styles.btn, { backgroundColor: c.accentPrimary }]}>
            <Text style={[styles.btnLabel, { color: c.bgCard }]}>Try again</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { padding: 24, gap: 8, paddingTop: 60 },
  title: {
    fontFamily: "Georgia",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "Georgia",
    fontSize: 13,
    fontStyle: "italic",
    marginBottom: 12,
  },
  label: {
    fontFamily: "Georgia",
    fontSize: 11,
    fontStyle: "italic",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 4,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  errorName: {
    fontFamily: "Georgia",
    fontSize: 14,
    fontWeight: "700",
  },
  errorMessage: {
    fontFamily: "Georgia",
    fontSize: 14,
    marginTop: 2,
  },
  stack: {
    fontFamily: "Courier",
    fontSize: 11,
  },
  btn: {
    marginTop: 20,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  btnLabel: { fontFamily: "Georgia", fontSize: 14, fontWeight: "600" },
});
