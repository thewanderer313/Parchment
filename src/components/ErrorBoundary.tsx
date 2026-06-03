import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";

interface State {
  error: Error | null;
}

interface Props {
  children: React.ReactNode;
}

/**
 * Top-level error boundary. When a render-time error escapes one of our
 * screens, this surfaces the error name + message + stack on screen
 * instead of letting the app close silently. Production builds normally
 * swallow these to a blank crash; we want them visible.
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
    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.title}>Something broke</Text>
          <Text style={styles.subtitle}>
            Showing the error so we can diagnose. Tap "Try again" to recover.
          </Text>
          <Text style={styles.errorName}>{error.name}</Text>
          <Text style={styles.errorMessage}>{error.message}</Text>
          <Text style={styles.label}>Stack</Text>
          <Text style={styles.stack}>{error.stack ?? "(no stack available)"}</Text>
          <Pressable onPress={this.reset} style={styles.btn}>
            <Text style={styles.btnLabel}>Try again</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#e8dec5" },
  body: { padding: 24, gap: 8, paddingTop: 60 },
  title: {
    fontFamily: "Georgia",
    fontSize: 22,
    fontWeight: "700",
    color: "#1f3024",
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "Georgia",
    fontSize: 13,
    fontStyle: "italic",
    color: "#4a6b48",
    marginBottom: 12,
  },
  label: {
    fontFamily: "Georgia",
    fontSize: 11,
    fontStyle: "italic",
    color: "#4a6b48",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 4,
  },
  errorName: {
    fontFamily: "Georgia",
    fontSize: 14,
    fontWeight: "700",
    color: "#1f3024",
  },
  errorMessage: {
    fontFamily: "Georgia",
    fontSize: 14,
    color: "#2a3b2e",
    marginTop: 2,
  },
  stack: {
    fontFamily: "Courier",
    fontSize: 11,
    color: "#2a3b2e",
  },
  btn: {
    marginTop: 20,
    backgroundColor: "#2f4a35",
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  btnLabel: { color: "#f5ecd4", fontFamily: "Georgia", fontSize: 14, fontWeight: "600" },
});
