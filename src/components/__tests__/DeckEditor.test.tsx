import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { DeckEditor } from "../DeckEditor";
import { ThemeProvider } from "@/theme/ThemeProvider";

describe("DeckEditor", () => {
  it("populates fields from the initial values prop", () => {
    render(
      <ThemeProvider mode="light">
        <DeckEditor
          initial={{ name: "Spanish", emoji: "🌿", description: "Beginner", coverImage: null }}
          onSubmit={jest.fn()}
          onCancel={jest.fn()}
        />
      </ThemeProvider>
    );
    expect(screen.getByDisplayValue("Spanish")).toBeOnTheScreen();
    expect(screen.getByDisplayValue("🌿")).toBeOnTheScreen();
    expect(screen.getByDisplayValue("Beginner")).toBeOnTheScreen();
  });

  it("calls onSubmit with the typed values when Save is pressed", () => {
    const onSubmit = jest.fn();
    render(
      <ThemeProvider mode="light">
        <DeckEditor
          initial={{ name: "", emoji: null, description: null, coverImage: null }}
          onSubmit={onSubmit}
          onCancel={jest.fn()}
        />
      </ThemeProvider>
    );
    fireEvent.changeText(screen.getByPlaceholderText(/name/i), "French");
    fireEvent.changeText(screen.getByPlaceholderText(/emoji/i), "🇫🇷");
    fireEvent.changeText(screen.getByPlaceholderText(/description/i), "Intermediate");
    fireEvent.press(screen.getByRole("button", { name: /^save$/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      name: "French", emoji: "🇫🇷", description: "Intermediate", coverImage: null,
    });
  });

  it("does not call onSubmit when the name is blank", () => {
    const onSubmit = jest.fn();
    render(
      <ThemeProvider mode="light">
        <DeckEditor
          initial={{ name: "", emoji: null, description: null, coverImage: null }}
          onSubmit={onSubmit}
          onCancel={jest.fn()}
        />
      </ThemeProvider>
    );
    fireEvent.press(screen.getByRole("button", { name: /^save$/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/name is required/i)).toBeOnTheScreen();
  });

  it("calls onCancel when Cancel is pressed", () => {
    const onCancel = jest.fn();
    render(
      <ThemeProvider mode="light">
        <DeckEditor
          initial={{ name: "X", emoji: null, description: null, coverImage: null }}
          onSubmit={jest.fn()}
          onCancel={onCancel}
        />
      </ThemeProvider>
    );
    fireEvent.press(screen.getByRole("button", { name: /^cancel$/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("converts empty emoji / description text back to null on submit", () => {
    const onSubmit = jest.fn();
    render(
      <ThemeProvider mode="light">
        <DeckEditor
          initial={{ name: "X", emoji: "🌿", description: "Beginner", coverImage: null }}
          onSubmit={onSubmit}
          onCancel={jest.fn()}
        />
      </ThemeProvider>
    );
    fireEvent.changeText(screen.getByPlaceholderText(/emoji/i), "");
    fireEvent.changeText(screen.getByPlaceholderText(/description/i), "");
    fireEvent.press(screen.getByRole("button", { name: /^save$/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      name: "X", emoji: null, description: null, coverImage: null,
    });
  });
});
