import React from "react";
import { render, screen } from "@testing-library/react-native";
import { EmptyDeckList } from "../EmptyDeckList";
import { ThemeProvider } from "@/theme/ThemeProvider";

describe("EmptyDeckList", () => {
  it("renders the headline + copy + unified accessibility label", () => {
    render(
      <ThemeProvider mode="light">
        <EmptyDeckList />
      </ThemeProvider>
    );
    expect(screen.getByText("Empty shelves.")).toBeOnTheScreen();
    expect(
      screen.getByText(/tap the \+ above to compose your first deck\./i)
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText(
        /empty library\. tap the \+ above to compose your first deck\./i
      )
    ).toBeOnTheScreen();
  });
});
