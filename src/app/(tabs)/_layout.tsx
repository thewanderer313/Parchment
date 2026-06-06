import React from "react";
import { Tabs } from "expo-router";

// Two-mode IA: Study (the default landing tab) and Library, navigated
// by tapping the screen-title word at the top-left of each screen
// (see the Pressable on the "STUDY" / "LIBRARY" Cinzel title in
// index.tsx and library.tsx).
//
// The Tabs navigator is kept for routing structure — both screens
// stay mounted, navigation between them is cheap — but the visual
// tab bar is hidden via `display: 'none'`. The per-screen title
// itself acts as the switch, freeing up bottom screen real estate
// and giving the app a cleaner single-mode feel.
//
// Stack screens like deck/[id]/*, deck/new, and settings still push
// on top of whichever tab they were opened from.
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Study" }} />
      <Tabs.Screen name="library" options={{ title: "Library" }} />
    </Tabs>
  );
}
