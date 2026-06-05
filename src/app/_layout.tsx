import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  useColorScheme,
} from "react-native";
import {
  useFonts,
  EBGaramond_400Regular,
  EBGaramond_400Regular_Italic,
  EBGaramond_700Bold,
} from "@expo-google-fonts/eb-garamond";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";
import { lightTheme, darkTheme, type Theme } from "@/theme/palette";
import { FONT_SERIF, FONT_DISPLAY } from "@/theme/fonts";
import { useSettingsStore } from "@/store/settingsStore";
import { useDecksStore } from "@/store/decksStore";
import { useCardsStore } from "@/store/cardsStore";
import { getDatabase } from "@/db/client";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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
          headerTitleStyle: { fontFamily: FONT_DISPLAY, fontSize: 18 },
          headerShadowVisible: false,
        }}
      >
        {/* The (tabs) group is the app's root; it brings its own tab bar
            and per-tab header, so the outer Stack shouldn't draw a header
            of its own. All other Stack screens (deck/*, settings) still
            get the default header configured above. */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

function FullScreenStatus({
  status,
  palette,
  onRetry,
}: {
  status: BootStatus;
  palette: Theme;
  onRetry: () => void;
}) {
  const c = palette.colors;
  if (status === "loading") {
    return (
      <View style={[styles.fullScreen, { backgroundColor: c.bgApp }]}>
        <ActivityIndicator color={c.accentPrimary} />
      </View>
    );
  }
  return (
    <View style={[styles.fullScreen, { backgroundColor: c.bgApp }]}>
      <Text style={[styles.errorTitle, { color: c.textPrimary }]}>
        Couldn't open the library
      </Text>
      <Text style={[styles.errorBody, { color: c.textMuted }]}>
        Parchment couldn't initialize its database. This is unusual — try again.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={[styles.retry, { backgroundColor: c.accentPrimary }]}
      >
        <Text style={[styles.retryLabel, { color: c.bgCard }]}>Try again</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  const [status, setStatus] = useState<BootStatus>("loading");
  const themeMode = useSettingsStore((s) => s.themeMode);
  const systemScheme = useColorScheme();
  const bootPalette: Theme = systemScheme === "dark" ? darkTheme : lightTheme;
  // EB Garamond is used for screen titles and deck names. Block ready
  // status until it's loaded so the first paint isn't a Georgia title
  // briefly swapping for a Garamond one — looks janky on dev-client.
  const [fontsLoaded] = useFonts({
    EBGaramond_400Regular,
    EBGaramond_400Regular_Italic,
    EBGaramond_700Bold,
  });

  const hydrate = () => {
    setStatus("loading");
    let cancelled = false;
    (async () => {
      try {
        await getDatabase();
        await useSettingsStore.getState().load();
        await useDecksStore.getState().load();
        await useCardsStore.getState().loadCounts();
        if (!cancelled) setStatus("ready");
      } catch (e) {
        console.warn("Parchment hydrate failed:", e);
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    const cancel = hydrate();
    return cancel;
  }, []);

  if (status !== "ready" || !fontsLoaded) {
    return <FullScreenStatus status={status} palette={bootPalette} onRetry={hydrate} />;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider mode={themeMode}>
            <ThemedStack />
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
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
    textAlign: "center",
  },
  errorBody: {
    fontFamily: FONT_SERIF,
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    maxWidth: 320,
  },
  retry: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 999,
  },
  retryLabel: { fontSize: 14, fontWeight: "600" },
});
