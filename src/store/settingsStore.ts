import { create } from "zustand";
import { getDatabase } from "@/db/client";
import { THEME_SELECTIONS, type ThemeSelection } from "@/theme/palette";

type Status = "idle" | "loading" | "ready" | "error";

interface SettingsState {
  themeMode: ThemeSelection;
  status: Status;
  load: () => Promise<void>;
  setThemeMode: (mode: ThemeSelection) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  themeMode: "system",
  status: "idle",
  async load() {
    set({ status: "loading" });
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<{ key: string; value: string }>(
        "SELECT key, value FROM settings WHERE key = 'theme_mode';"
      );
      const stored = rows[0]?.value;
      const mode: ThemeSelection = THEME_SELECTIONS.includes(stored as ThemeSelection)
        ? (stored as ThemeSelection)
        : "system";
      set({ themeMode: mode, status: "ready" });
    } catch (e) {
      set({ status: "error" });
      throw e;
    }
  },
  async setThemeMode(mode) {
    const db = await getDatabase();
    await (db as { runAsync: (sql: string, ...params: unknown[]) => Promise<unknown> }).runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);",
      "theme_mode",
      mode
    );
    set({ themeMode: mode });
  },
}));
