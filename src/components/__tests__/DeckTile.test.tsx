import React from "react";
import { render, screen } from "@testing-library/react-native";
import { DeckTile } from "../DeckTile";
import { ThemeProvider } from "@/theme/ThemeProvider";
import type { Deck } from "@/store/decksStore";

function makeDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: "d1",
    name: "Spanish Vocab",
    emoji: "🌿",
    description: null,
    coverImage: null,
    shuffleEnabled: false,
    sortOrder: 0,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe("DeckTile", () => {
  it("renders the deck name, emoji, and card count", () => {
    const deck = makeDeck();
    render(
      <ThemeProvider mode="light">
        <DeckTile deck={deck} cardCount={24} onPress={() => {}} onLongPress={() => {}} />
      </ThemeProvider>
    );
    expect(screen.getByText("Spanish Vocab")).toBeOnTheScreen();
    expect(screen.getByText("🌿")).toBeOnTheScreen();
    expect(screen.getByText(/24 cards/i)).toBeOnTheScreen();
  });

  it("pluralizes the card count correctly", () => {
    render(
      <ThemeProvider mode="light">
        <DeckTile deck={makeDeck()} cardCount={1} onPress={() => {}} onLongPress={() => {}} />
      </ThemeProvider>
    );
    expect(screen.getByText(/1 card$/i)).toBeOnTheScreen();
  });

  it("renders empty count text when cardCount is 0", () => {
    render(
      <ThemeProvider mode="light">
        <DeckTile deck={makeDeck()} cardCount={0} onPress={() => {}} onLongPress={() => {}} />
      </ThemeProvider>
    );
    expect(screen.getByText(/empty/i)).toBeOnTheScreen();
  });

  it("uses a placeholder glyph when emoji is null", () => {
    const deck = makeDeck({ emoji: null });
    render(
      <ThemeProvider mode="light">
        <DeckTile deck={deck} cardCount={0} onPress={() => {}} onLongPress={() => {}} />
      </ThemeProvider>
    );
    expect(screen.getByText("📁")).toBeOnTheScreen();
  });
});
