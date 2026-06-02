import React from "react";
import { Text } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { ThemeProvider, useTheme } from "../ThemeProvider";
import { lightTheme, darkTheme } from "../palette";

jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({
  __esModule: true,
  default: jest.fn(),
}));
const useColorScheme = require("react-native/Libraries/Utilities/useColorScheme").default;

function Probe() {
  const { theme } = useTheme();
  return <Text testID="probe">{theme.mode}:{theme.colors.bgApp}</Text>;
}

describe("ThemeProvider", () => {
  it("uses light theme when the system color scheme is light", () => {
    useColorScheme.mockReturnValue("light");
    render(
      <ThemeProvider mode="system">
        <Probe />
      </ThemeProvider>
    );
    expect(screen.getByTestId("probe")).toHaveTextContent(`light:${lightTheme.colors.bgApp}`);
  });

  it("uses dark theme when the system color scheme is dark", () => {
    useColorScheme.mockReturnValue("dark");
    render(
      <ThemeProvider mode="system">
        <Probe />
      </ThemeProvider>
    );
    expect(screen.getByTestId("probe")).toHaveTextContent(`dark:${darkTheme.colors.bgApp}`);
  });

  it("overrides system preference when an explicit mode is provided", () => {
    useColorScheme.mockReturnValue("dark");
    render(
      <ThemeProvider mode="light">
        <Probe />
      </ThemeProvider>
    );
    expect(screen.getByTestId("probe")).toHaveTextContent(`light:${lightTheme.colors.bgApp}`);
  });

  it("throws if useTheme is called outside the provider", () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/useTheme must be used inside a ThemeProvider/);
    consoleError.mockRestore();
  });
});
