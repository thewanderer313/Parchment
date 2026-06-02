import { useSettingsStore } from "../settingsStore";
import { getDatabase } from "@/db/client";

interface SettingRow { key: string; value: string; }

const fakeDb = {
  rows: [] as SettingRow[],
  async getAllAsync<T>(_sql: string): Promise<T[]> {
    return this.rows as unknown as T[];
  },
  async runAsync(sql: string, ...params: unknown[]) {
    if (sql.includes("INSERT OR REPLACE INTO settings")) {
      const [key, value] = params as [string, string];
      const existing = this.rows.find((r) => r.key === key);
      if (existing) existing.value = value;
      else this.rows.push({ key, value });
    }
  },
};

jest.mock("@/db/client", () => ({
  getDatabase: jest.fn(),
}));

const mockedGetDatabase = jest.mocked(getDatabase);

describe("settingsStore", () => {
  beforeEach(() => {
    fakeDb.rows = [];
    useSettingsStore.setState({ themeMode: "system", status: "idle" });
    mockedGetDatabase.mockReset();
    mockedGetDatabase.mockResolvedValue(fakeDb as never);
  });

  it("defaults to themeMode='system' before load", () => {
    expect(useSettingsStore.getState().themeMode).toBe("system");
  });

  it("loads themeMode from settings table", async () => {
    fakeDb.rows = [{ key: "theme_mode", value: "dark" }];
    await useSettingsStore.getState().load();
    expect(useSettingsStore.getState().themeMode).toBe("dark");
    expect(useSettingsStore.getState().status).toBe("ready");
  });

  it("falls back to 'system' when no theme_mode row exists", async () => {
    await useSettingsStore.getState().load();
    expect(useSettingsStore.getState().themeMode).toBe("system");
  });

  it("falls back to 'system' when stored value is not a recognized mode", async () => {
    fakeDb.rows = [{ key: "theme_mode", value: "neon" }];
    await useSettingsStore.getState().load();
    expect(useSettingsStore.getState().themeMode).toBe("system");
  });

  it("setThemeMode writes the value to the database and updates state", async () => {
    await useSettingsStore.getState().setThemeMode("light");
    expect(fakeDb.rows).toEqual([{ key: "theme_mode", value: "light" }]);
    expect(useSettingsStore.getState().themeMode).toBe("light");
  });

  it("setThemeMode replaces an existing value on subsequent calls", async () => {
    await useSettingsStore.getState().setThemeMode("light");
    await useSettingsStore.getState().setThemeMode("dark");
    expect(fakeDb.rows).toEqual([{ key: "theme_mode", value: "dark" }]);
    expect(useSettingsStore.getState().themeMode).toBe("dark");
  });

  it("load sets status to 'error' and re-throws when the query fails", async () => {
    const failingDb = {
      getAllAsync: jest.fn().mockRejectedValue(new Error("read boom")),
      runAsync: jest.fn(),
    };
    mockedGetDatabase.mockResolvedValueOnce(failingDb as never);
    await expect(useSettingsStore.getState().load()).rejects.toThrow("read boom");
    expect(useSettingsStore.getState().status).toBe("error");
  });

  it("setThemeMode propagates write errors without updating state", async () => {
    const failingDb = {
      getAllAsync: jest.fn(),
      runAsync: jest.fn().mockRejectedValue(new Error("write boom")),
    };
    mockedGetDatabase.mockResolvedValueOnce(failingDb as never);
    await expect(useSettingsStore.getState().setThemeMode("dark")).rejects.toThrow("write boom");
    expect(useSettingsStore.getState().themeMode).toBe("system");
  });
});
