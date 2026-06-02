import React from "react";
import { render, screen } from "@testing-library/react-native";
import { MarkdownText } from "../MarkdownText";
import { ThemeProvider } from "@/theme/ThemeProvider";

describe("MarkdownText", () => {
  it("renders plain text content via the markdown library", () => {
    render(
      <ThemeProvider mode="light">
        <MarkdownText>hello world</MarkdownText>
      </ThemeProvider>
    );
    expect(screen.getByText(/hello world/i)).toBeOnTheScreen();
  });

  it("renders an italic empty placeholder when given an empty string", () => {
    render(
      <ThemeProvider mode="light">
        <MarkdownText>{""}</MarkdownText>
      </ThemeProvider>
    );
    expect(screen.getByText(/\(empty\)/i)).toBeOnTheScreen();
  });

  it("renders an italic empty placeholder when given only whitespace", () => {
    render(
      <ThemeProvider mode="light">
        <MarkdownText>{"   \n  "}</MarkdownText>
      </ThemeProvider>
    );
    expect(screen.getByText(/\(empty\)/i)).toBeOnTheScreen();
  });
});
