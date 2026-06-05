import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

interface Props {
  children: React.ReactNode;
  width: number;
}

// A single shelf: the row of books (children) resting on a wooden
// plank. The plank is a flat strip in a warm wood tone with a thin
// highlight on its top edge to suggest a beveled lip — just enough
// 3D-ness to read as "the books are STANDING ON something" rather
// than "the books are floating".
//
// Books are bottom-aligned in the row so their feet sit on the plank;
// taller books rise above shorter ones the way a real shelf displays.
export function Shelf({ children, width }: Props) {
  const { theme } = useTheme();
  // Wood tone derived from the theme so the shelf reads the same in
  // light and dark mode without baking in literal browns. In light
  // mode the shelf is a slightly darker warm tan than bgApp; in dark
  // mode it's a slightly lighter slate than bgApp.
  const shelfColor =
    theme.mode === "light" ? "#b89e6f" : "#3a3a32";
  const highlightColor =
    theme.mode === "light" ? "#d7c098" : "#5a5a4a";
  const shadowColor =
    theme.mode === "light" ? "rgba(60, 40, 20, 0.25)" : "rgba(0, 0, 0, 0.4)";
  return (
    <View style={[styles.wrap, { width }]}>
      <View style={[styles.booksRow, { width }]}>{children}</View>
      <View style={[styles.shelfPlank, { backgroundColor: shelfColor, width }]}>
        <View style={[styles.shelfLip, { backgroundColor: highlightColor }]} />
        <View style={[styles.shelfShadow, { backgroundColor: shadowColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "center",
    marginBottom: 22,
  },
  booksRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    gap: 8,
    paddingHorizontal: 4,
  },
  shelfPlank: {
    height: 10,
    borderRadius: 2,
    marginTop: -1,
    overflow: "hidden",
  },
  shelfLip: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  shelfShadow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
});
