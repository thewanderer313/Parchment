import { migrations, runMigrations } from "../migrations";

interface FakeDb {
  executed: string[];
  execAsync: (sql: string) => Promise<void>;
  getAllAsync: <T>(sql: string) => Promise<T[]>;
}

function makeFakeDb(): FakeDb {
  const state = {
    version: 0,
    executed: [] as string[],
  };
  return {
    executed: state.executed,
    async execAsync(sql: string) {
      state.executed.push(sql);
      const match = sql.match(/PRAGMA user_version = (\d+)/);
      if (match) state.version = Number(match[1]);
    },
    async getAllAsync<T>(sql: string): Promise<T[]> {
      if (sql.includes("PRAGMA user_version")) {
        return [{ user_version: state.version } as unknown as T];
      }
      return [];
    },
  };
}

describe("runMigrations", () => {
  it("declares at least one migration to create the v1 schema", () => {
    expect(migrations.length).toBeGreaterThanOrEqual(1);
    expect(migrations[0].version).toBe(1);
  });

  it("runs every migration on a fresh database", async () => {
    const db = makeFakeDb();
    await runMigrations(db as any);
    expect(db.executed.some((s) => /\bCREATE\s+TABLE\s+decks\b/i.test(s))).toBe(true);
    expect(db.executed.some((s) => /\bCREATE\s+TABLE\s+cards\b/i.test(s))).toBe(true);
    expect(db.executed.some((s) => /\bCREATE\s+TABLE\s+settings\b/i.test(s))).toBe(true);
    expect(db.executed.some((s) => /\bPRAGMA\s+user_version\s*=\s*\d+/i.test(s))).toBe(true);
  });

  it("is idempotent — running twice on an already-current DB executes no schema statements", async () => {
    const db = makeFakeDb();
    await runMigrations(db as any);
    const firstRunCount = db.executed.length;
    await runMigrations(db as any);
    expect(db.executed.length).toBe(firstRunCount);
  });
});
