import React, { useState } from "react";
import { Pressable, View, StyleSheet } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, interpolate } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { useReduceMotion } from "@/lib/useReduceMotion";

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
      <Animated.View style={[styles.face, { backgroundColor: theme.colors.bgCard }, frontStyle]}>
        <View style={styles.faceContent}>{front}</View>
      </Animated.View>
      <Animated.View style={[styles.face, { backgroundColor: theme.colors.bgCard }, backStyle]}>
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
    borderRadius: 18,
    overflow: "hidden",
    backfaceVisibility: "hidden",
  },
  faceContent: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
});
