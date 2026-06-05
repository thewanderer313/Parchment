import React, { useEffect } from "react";
import { Image, StyleSheet } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

// Full-bleed JS splash overlay. The native splash (Android 12+ system
// splash, iOS launch screen) is too tightly bound to "centred icon on
// a coloured background" to render our hand-illustrated title page at
// full size — `resizeMode: cover` in app.json is ignored on Android's
// system splash. So we render the splash image ourselves on top of
// everything else and control how long it lingers + how it fades.
//
// The native splash still happens first (briefly), and then this
// component covers it during the JS bundle warm-up. As long as the
// native splash uses a matching solid backgroundColor (configured in
// app.json), the visible transition is just "dark screen → dark
// screen with art".
//
// The image is `require()`d statically so Metro bundles it; it loads
// synchronously when this component renders.

interface Props {
  /** When false, the splash fades out and then calls onHidden once
   *  the animation finishes. While true the splash stays at full
   *  opacity. */
  visible: boolean;
  /** Fired after the fade-out animation completes — parent unmounts
   *  the component here so it stops eating render time. */
  onHidden: () => void;
  /** Fade-out animation duration in ms. Default 600. */
  fadeMs?: number;
}

const SPLASH_BG = "#190901"; // matches the splash image's corner pixels

export function ParchmentSplash({ visible, onHidden, fadeMs = 600 }: Props) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (visible) return;
    opacity.value = withTiming(
      0,
      { duration: fadeMs, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onHidden)();
      }
    );
  }, [visible, opacity, onHidden, fadeMs]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View pointerEvents="none" style={[styles.root, animStyle]}>
      <Image
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        source={require("../../assets/images/splashscreen.png")}
        style={styles.image}
        resizeMode="cover"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: SPLASH_BG,
    zIndex: 1000,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
