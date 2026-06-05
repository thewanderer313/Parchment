import React, { useState } from "react";
import { Pressable, View, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, interpolate } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import type { Theme } from "@/theme/palette";
import { useReduceMotion } from "@/lib/useReduceMotion";

// A small folded page corner in the bottom-right of the front face.
// Pure decoration — telegraphs "this is a page, not a card" — but only
// on the front because the back side reads as "the other side of the
// page" rather than "another page with its own corner to turn." Cheap
// SVG (three paths) so it costs nothing at scroll.
function PageCurl({ theme }: { theme: Theme }) {
  const c = 28;
  return (
    <View pointerEvents="none" style={styles.curl}>
      <Svg width={c} height={c}>
        {/* Soft shadow where the corner lifts off the page. */}
        <Path
          d={`M 0 ${c} L ${c} 0 L ${c} ${c} Z`}
          fill={theme.colors.accentSoft}
          opacity={0.55}
        />
        {/* The folded-over flap itself, painted in the room/bg tone so
            it reads as the back of the page lit from elsewhere. */}
        <Path
          d={`M 3 ${c} L ${c} 3 L ${c} ${c} Z`}
          fill={theme.colors.bgApp}
        />
        {/* Fold edge — hairline diagonal. */}
        <Path
          d={`M 3 ${c} L ${c} 3`}
          stroke={theme.colors.accentSoft}
          strokeWidth={0.8}
        />
      </Svg>
    </View>
  );
}

interface Props {
  front: React.ReactNode;
  back: React.ReactNode;
  flipped?: boolean;
  onFlip?: (next: boolean) => void;
}

export function FlipCard({ front, back, flipped: controlled, onFlip }: Props) {
  const { theme } = useTheme();
  const reduce = useReduceMotion();
  const [uncontrolled, setUncontrolled] = useState(false);
  const flipped = controlled ?? uncontrolled;
  const progress = useSharedValue(0);

  React.useEffect(() => {
    const target = flipped ? 1 : 0;
    if (reduce) {
      progress.value = target;
    } else {
      progress.value = withTiming(target, { duration: 380, easing: Easing.inOut(Easing.cubic) });
    }
  }, [flipped, reduce, progress]);

  const toggle = () => {
    const next = !flipped;
    if (onFlip) onFlip(next);
    else setUncontrolled(next);
  };

  const frontStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(progress.value, [0, 1], [0, 180]);
    const opacity = progress.value < 0.5 ? 1 : 0;
    return {
      transform: [{ perspective: 1200 }, { rotateY: `${rotateY}deg` }],
      opacity,
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(progress.value, [0, 1], [180, 360]);
    const opacity = progress.value > 0.5 ? 1 : 0;
    return {
      transform: [{ perspective: 1200 }, { rotateY: `${rotateY}deg` }],
      opacity,
    };
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Flip card"
      onPress={toggle}
      style={styles.root}
    >
      <Animated.View
        style={[
          styles.face,
          {
            backgroundColor: theme.colors.bgCard,
            borderColor: theme.colors.accentSoft,
          },
          frontStyle,
        ]}
      >
        <View style={styles.faceContent}>{front}</View>
        <PageCurl theme={theme} />
      </Animated.View>
      <Animated.View
        style={[
          styles.face,
          {
            backgroundColor: theme.colors.bgCard,
            borderColor: theme.colors.accentSoft,
          },
          backStyle,
        ]}
      >
        <View style={styles.faceContent}>{back}</View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  face: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    overflow: "hidden",
    backfaceVisibility: "hidden",
    // Hairline border — the card reads as a bordered folio rather
    // than a floating colored rectangle. Subtle but high impact.
    borderWidth: StyleSheet.hairlineWidth,
  },
  faceContent: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
  curl: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
  },
});
