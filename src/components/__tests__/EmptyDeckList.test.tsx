import React from "react";
import { render, screen } from "@testing-library/react-native";
import { EmptyDeckList } from "../EmptyDeckList";
import { ThemeProvider } from "@/theme/ThemeProvider";

describe("EmptyDeckList", () => {
  it("renders the empty-state glyph, copy, and a unified accessibility label", () => {
    render(
      <ThemeProvider mode="light">
        <EmptyDeckList />
      </ThemeProvider>
    );
    expect(screen.getByText("📚")).toBeOnTheScreen();
    expect(screen.getByText(/tap \+ to create your first deck/i)).toBeOnTheScreen();
    expect(
      screen.getByLabelText(/empty library\. tap \+ to create your first deck\./i)
    ).toBeOnTheScreen();
  });
});
