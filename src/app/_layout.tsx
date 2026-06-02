import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF } from "@/theme/fonts";
import { useSettingsStore } from "@/store/settingsStore";
import { useDecksStore } from "@/store/decksStore";
import { getDatabase } from "@/db/client";

type BootStatus = "loading" | "ready" | "error";

function ThemedStack() {
  const { theme } = useTheme();
  return (
    <>
      <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.colors.bgApp },
          headerStyle: { backgroundColor: theme.colors.bgApp },
          headerTintColor: theme.colors.textPrimary,
          headerTitleStyle: { fontFamily: FONT_SERIF, fontWeight: "700" },
          headerShadowVisible: false,
        }}
      />
    </>
  );
}

function FullScreenStatus({ status, onRetry }: { status: BootStatus; onRetry: () => void }) {
  if (status === "loading") {
    return (
      <View style={[styles.fullScreen, { backgroundColor: "#e8dec5" }]}>
        <ActivityIndicator color="#2f4a35" />
      </View>
    );
  }
  return (
    <View style={[styles.fullScreen, { backgroundColor: "#e8dec5" }]}>
      <Text style={styles.errorTitle}>Couldn't open the library</Text>
      <Text style={styles.errorBody}>
        Parchment couldn't initialize its database. This is unusual — try again.
      </Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}>
        <Text style={styles.retryLabel}>Try again</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  const [status, setStatus] = useState<BootStatus>("loading");
  const themeMode = useSettingsStore((s) => s.themeMode);

  const hydrate = async () => {
    setStatus("loading");
    try {
      await getDatabase();
      await useSettingsStore.getState().load();
      await useDecksStore.getState().load();
      setStatus("ready");
    } catch (e) {
      console.warn("Parchment hydrate failed:", e);
      setStatus("error");
    }
  };

  useEffect(() => {
    hydrate();
  }, []);

  if (status !== "ready") {
    return <FullScreenStatus status={status} onRetry={hydrate} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider mode={themeMode}>
          <ThemedStack />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 14,
  },
  errorTitle: {
    fontFamily: FONT_SERIF,
    fontSize: 22,
    fontWeight: "700",
    color: "#1f3024",
    textAlign: "center",
  },
  errorBody: {
    fontFamily: FONT_SERIF,
    fontSize: 14,
    fontStyle: "italic",
    color: "#4a6b48",
    textAlign: "center",
    maxWidth: 320,
  },
  retry: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 22,
    backgroundColor: "#2f4a35",
    borderRadius: 999,
  },
  retryLabel: { color: "#f5ecd4", fontSize: 14, fontWeight: "600" },
});
