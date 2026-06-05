import React from "react";
import { Text } from "react-native";
import { Tabs } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF } from "@/theme/fonts";

// Two-mode IA: Study (the default landing tab) puts the reader-facing
// purpose front and centre; Library is where authoring lives. Stack
// screens like deck/[id]/*, deck/new, and settings are pushed on top
// of whichever tab they were opened from.
export default function TabsLayout() {
  const { theme } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accentPrimary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.bgApp,
          borderTopColor: theme.colors.accentSoft,
        },
        tabBarLabelStyle: {
          fontFamily: FONT_SERIF,
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Study",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22, color }}>📖</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22, color }}>📚</Text>
          ),
        }}
      />
    </Tabs>
  );
}
