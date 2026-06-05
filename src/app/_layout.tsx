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
import * as SplashScreen from "expo-splash-screen";
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
import { ParchmentSplash } from "@/components/ParchmentSplash";

// Pin the native splash up at module-load time so it doesn't auto-
// dismiss the instant the JS bundle is ready. We dismiss it manually
// once the JS-side splash overlay has mounted and is covering the
// screen — that way the transition from native splash → JS splash is
// just "dark screen with optional icon → dark screen with full art",
// not a flicker through the empty app shell.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden — happens during fast-refresh in dev. Ignore.
});

// Minimum visible time at full opacity, so the user has a moment to
// take in the title-page art before the app comes alive. If hydration
// takes longer than this we'll still wait for the data; this floor
// just prevents the splash from disappearing in a split second when
// boot is fast. User-tuned to 1.5 s: long enough to land the art, not
// so long that returning users feel made to wait.
const MIN_FULL_VISIBILITY_MS = 1500;

type BootStatus = "loading" | "ready" | "error";

function ThemedStack() {
  const { theme } = useTheme();
  return (
    <>
      {/* Light icons on any dark surface (dark + leather), dark icons
          on the parchment light field. */}
      <StatusBar style={theme.mode === "light" ? "dark" : "light"} />
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

  // Splash state — three concerns:
  //   minDurationDone   — has MIN_FULL_VISIBILITY_MS elapsed since boot
  //   splashVisible     — should the splash overlay still be at full
  //                       opacity (vs starting its fade-out)?
  //   splashMounted     — is the splash component still mounted? It
  //                       unmounts itself after the fade animation
  //                       completes so it stops occupying GPU work.
  const [minDurationDone, setMinDurationDone] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashMounted, setSplashMounted] = useState(true);

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

  // Start the minimum-visibility timer + dismiss the native splash.
  // The native splash is dismissed as soon as the JS layout is
  // running so our JS splash takes over visually — we keep the JS
  // overlay up for the user-facing lingering.
  useEffect(() => {
    const t = setTimeout(() => setMinDurationDone(true), MIN_FULL_VISIBILITY_MS);
    SplashScreen.hideAsync().catch(() => {
      // Already hidden / never shown (e.g., fast refresh). No-op.
    });
    return () => clearTimeout(t);
  }, []);

  // Start the fade-out once data is ready AND the minimum visible
  // time has elapsed. After this flips false the splash component
  // animates opacity → 0, then calls back into onHidden which clears
  // splashMounted so the component unmounts.
  useEffect(() => {
    if (status === "ready" && fontsLoaded && minDurationDone) {
      setSplashVisible(false);
    }
  }, [status, fontsLoaded, minDurationDone]);

  // Body — the app or the boot-error fallback. The splash overlay
  // sits on top regardless until splashMounted goes false.
  const body =
    status === "ready" && fontsLoaded ? (
      <ThemeProvider mode={themeMode}>
        <ThemedStack />
      </ThemeProvider>
    ) : status === "error" ? (
      <FullScreenStatus status={status} palette={bootPalette} onRetry={hydrate} />
    ) : (
      // While loading, the splash is covering the screen anyway, so
      // we render a transparent placeholder underneath. Avoids the
      // ActivityIndicator briefly flashing through when the splash
      // starts to fade.
      <View style={{ flex: 1, backgroundColor: bootPalette.colors.bgApp }} />
    );

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>{body}</SafeAreaProvider>
        {splashMounted && (
          <ParchmentSplash
            visible={splashVisible}
            onHidden={() => setSplashMounted(false)}
          />
        )}
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
