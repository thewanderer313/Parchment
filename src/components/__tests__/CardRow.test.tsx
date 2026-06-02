import React from "react";
import { render, screen } from "@testing-library/react-native";
import { CardRow } from "../CardRow";
import { ThemeProvider } from "@/theme/ThemeProvider";
import type { Card } from "@/store/cardsStore";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "c1", deckId: "d1",
    frontText: "What is the capital of France?",
    frontImages: [], backText: "Paris", backImages: [],
    sortOrder: 0, createdAt: 0, updatedAt: 0,
    ...overrides,
  };
}

describe("CardRow", () => {
  it("renders the first chars of front text", () => {
    render(
      <ThemeProvider mode="light">
        <CardRow card={makeCard()} onPress={() => {}} onLongPress={() => {}} />
      </ThemeProvider>
    );
    expect(screen.getByText(/capital of France/)).toBeOnTheScreen();
  });

  it("shows an image-attachment indicator when front_images is non-empty", () => {
    render(
      <ThemeProvider mode="light">
        <CardRow card={makeCard({ frontImages: ["file:///doc/images/x.jpg"] })} onPress={() => {}} onLongPress={() => {}} />
      </ThemeProvider>
    );
    expect(screen.getByText("🖼")).toBeOnTheScreen();
  });

  it("shows an image-attachment indicator when back_images is non-empty", () => {
    render(
      <ThemeProvider mode="light">
        <CardRow card={makeCard({ backImages: ["file:///doc/images/y.jpg"] })} onPress={() => {}} onLongPress={() => {}} />
      </ThemeProvider>
    );
    expect(screen.getByText("🖼")).toBeOnTheScreen();
  });

  it("renders an italic '(empty)' label when frontText is blank", () => {
    render(
      <ThemeProvider mode="light">
        <CardRow card={makeCard({ frontText: "" })} onPress={() => {}} onLongPress={() => {}} />
      </ThemeProvider>
    );
    expect(screen.getByText(/\(empty\)/i)).toBeOnTheScreen();
  });
});
