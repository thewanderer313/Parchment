import { lightTheme, darkTheme, type Theme } from "../palette";

describe("theme palette", () => {
  it("defines every required token in the light theme", () => {
    const required: Array<keyof Theme["colors"]> = [
      "bgApp", "bgCard", "textPrimary", "textBody",
      "textMuted", "accentPrimary", "accentSoft",
    ];
    for (const key of required) {
      expect(lightTheme.colors[key]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("defines every required token in the dark theme", () => {
    const required: Array<keyof Theme["colors"]> = [
      "bgApp", "bgCard", "textPrimary", "textBody",
      "textMuted", "accentPrimary", "accentSoft",
    ];
    for (const key of required) {
      expect(darkTheme.colors[key]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("uses spec-defined hex values for the light theme", () => {
    expect(lightTheme.colors.bgApp).toBe("#e8dec5");
    expect(lightTheme.colors.bgCard).toBe("#f5ecd4");
    expect(lightTheme.colors.textPrimary).toBe("#1f3024");
    expect(lightTheme.colors.textBody).toBe("#2a3b2e");
    expect(lightTheme.colors.textMuted).toBe("#4a6b48");
    expect(lightTheme.colors.accentPrimary).toBe("#2f4a35");
    expect(lightTheme.colors.accentSoft).toBe("#c9bf9f");
  });

  it("uses spec-defined hex values for the dark theme", () => {
    expect(darkTheme.colors.bgApp).toBe("#1a1f1b");
    expect(darkTheme.colors.bgCard).toBe("#252b26");
    expect(darkTheme.colors.textPrimary).toBe("#f0e6cf");
    expect(darkTheme.colors.textBody).toBe("#d8cfb8");
    expect(darkTheme.colors.textMuted).toBe("#8aa37e");
    expect(darkTheme.colors.accentPrimary).toBe("#7fb087");
    expect(darkTheme.colors.accentSoft).toBe("#3a4438");
  });

  it("light and dark themes have the same set of color keys", () => {
    expect(Object.keys(lightTheme.colors).sort()).toEqual(
      Object.keys(darkTheme.colors).sort()
    );
  });
});
