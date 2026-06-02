import React from "react";
import { render, screen } from "@testing-library/react-native";
import { EmptyDeckList } from "../EmptyDeckList";
import { ThemeProvider } from "@/theme/ThemeProvider";

describe("EmptyDeckList", () => {
  it("shows the empty-state copy", () => {
    render(
      <ThemeProvider mode="light">
        <EmptyDeckList />
      </ThemeProvider>
    );
    expect(screen.getByText(/tap \+ to create your first deck/i)).toBeOnTheScreen();
  });
});
