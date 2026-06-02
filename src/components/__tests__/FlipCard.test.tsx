import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { Text } from "react-native";
import { FlipCard } from "../FlipCard";
import { ThemeProvider } from "@/theme/ThemeProvider";

describe("FlipCard", () => {
  it("renders the front face by default", () => {
    render(
      <ThemeProvider mode="light">
        <FlipCard front={<Text>FRONT</Text>} back={<Text>BACK</Text>} />
      </ThemeProvider>
    );
    expect(screen.getByText("FRONT")).toBeOnTheScreen();
  });

  it("toggles between front and back when the surface is tapped", () => {
    render(
      <ThemeProvider mode="light">
        <FlipCard front={<Text>FRONT</Text>} back={<Text>BACK</Text>} />
      </ThemeProvider>
    );
    fireEvent.press(screen.getByLabelText(/flip card/i));
    expect(screen.getByText("BACK")).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText(/flip card/i));
    expect(screen.getByText("FRONT")).toBeOnTheScreen();
  });
});
