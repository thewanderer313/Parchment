import { useDecksStore } from "../decksStore";
import { getDatabase } from "@/db/client";

interface DeckRow {
  id: string; name: string; emoji: string | null; description: string | null;
  cover_image: string | null; shuffle_enabled: number; sort_order: number;
  created_at: number; updated_at: number;
}

const fakeDb = {
  rows: [] as DeckRow[],
  ran: [] as { sql: string; params: unknown[] }[],
  async withTransactionAsync(cb: () => Promise<void>) {
    await cb();
  },
  async getAllAsync<T>(_sql: string): Promise<T[]> {
    return this.rows.slice().sort((a, b) =>
      a.sort_order - b.sort_order || a.created_at - b.created_at
    ) as unknown as T[];
  },
  async runAsync(sql: string, ...params: unknown[]) {
    this.ran.push({ sql, params });
    if (/^INSERT INTO decks/i.test(sql)) {
      const [id, name, emoji, description, cover_image, sort_order, created_at, updated_at] = params as [
        string, string, string | null, string | null, string | null, number, number, number,
      ];
      this.rows.push({
        id, name, emoji, description, cover_image,
        shuffle_enabled: 0, sort_order, created_at, updated_at,
      });
    } else if (/^UPDATE decks SET sort_order = \?/i.test(sql)) {
      const [sort_order, updated_at, id] = params as [number, number, string];
      const row = this.rows.find((r) => r.id === id);
      if (!row) return;
      row.sort_order = sort_order;
      row.updated_at = updated_at;
    } else if (/^UPDATE decks SET/i.test(sql) && /WHERE id = \?/i.test(sql)) {
      const ps = params as unknown[];
      const id = ps[ps.length - 1] as string;
      const row = this.rows.find((r) => r.id === id);
      if (!row) return;
      if (/name = \?/.test(sql)) row.name = ps[0] as string;
      if (/emoji = \?/.test(sql)) row.emoji = ps[1] as string | null;
      if (/description = \?/.test(sql)) row.description = ps[2] as string | null;
      if (/cover_image = \?/.test(sql)) row.cover_image = ps[3] as string | null;
      row.updated_at = ps[ps.length - 2] as number;
    } else if (/^DELETE FROM decks WHERE id = \?/i.test(sql)) {
      const [id] = params as [string];
      this.rows = this.rows.filter((r) => r.id !== id);
    }
  },
};

jest.mock("@/db/client", () => ({ getDatabase: jest.fn() }));
jest.mock("@/lib/uuid", () => ({ newUuid: jest.fn() }));

const mockedGetDatabase = jest.mocked(getDatabase);
const mockedNewUuid = jest.mocked(require("@/lib/uuid").newUuid);

describe("decksStore", () => {
  beforeEach(() => {
    fakeDb.rows = [];
    fakeDb.ran = [];
    useDecksStore.setState({ decks: [], status: "idle" });
    mockedGetDatabase.mockReset();
    mockedGetDatabase.mockResolvedValue(fakeDb as never);
    mockedNewUuid.mockReset();
    let uuidCounter = 0;
    mockedNewUuid
      .mockReturnValueOnce("uuid-1")
      .mockReturnValueOnce("uuid-2")
      .mockImplementation(() => `uuid-fallback-${++uuidCounter}`);
  });

  it("starts in idle state with no decks", () => {
    const state = useDecksStore.getState();
    expect(state.decks).toEqual([]);
    expect(state.status).toBe("idle");
  });

  it("loads decks from the database and maps snake_case to camelCase", async () => {
    fakeDb.rows = [
      { id: "d1", name: "Spanish", emoji: "🌿", description: null,
        cover_image: null, shuffle_enabled: 1, sort_order: 0,
        created_at: 1000, updated_at: 1000 },
    ];
    await useDecksStore.getState().load();
    const { decks, status } = useDecksStore.getState();
    expect(status).toBe("ready");
    expect(decks).toHaveLength(1);
    expect(decks[0]).toEqual({
      id: "d1", name: "Spanish", emoji: "🌿", description: null,
      coverImage: null, shuffleEnabled: true, sortOrder: 0,
      createdAt: 1000, updatedAt: 1000,
    });
  });

  it("returns an empty array when the database has no decks", async () => {
    await useDecksStore.getState().load();
    expect(useDecksStore.getState().decks).toEqual([]);
    expect(useDecksStore.getState().status).toBe("ready");
  });

  it("sets status to 'error' and re-throws when the query fails", async () => {
    const failingDb = {
      getAllAsync: jest.fn().mockRejectedValue(new Error("db boom")),
      runAsync: jest.fn(),
    };
    mockedGetDatabase.mockResolvedValueOnce(failingDb as never);
    await expect(useDecksStore.getState().load()).rejects.toThrow("db boom");
    expect(useDecksStore.getState().status).toBe("error");
  });

  it("create() inserts a new deck and appends to the list with the next sort_order", async () => {
    await useDecksStore.getState().load();
    const created = await useDecksStore.getState().create({
      name: "Spanish", emoji: "🌿", description: "Beginner", coverImage: null,
    });
    expect(created.id).toBe("uuid-1");
    expect(created.name).toBe("Spanish");
    expect(created.sortOrder).toBe(0);
    const { decks } = useDecksStore.getState();
    expect(decks).toHaveLength(1);
    expect(decks[0]).toEqual(created);
    expect(fakeDb.ran[0].sql).toMatch(/^INSERT INTO decks/i);
  });

  it("create() assigns sequential sort_order values", async () => {
    await useDecksStore.getState().create({ name: "A", emoji: null, description: null, coverImage: null });
    await useDecksStore.getState().create({ name: "B", emoji: null, description: null, coverImage: null });
    const decks = useDecksStore.getState().decks;
    expect(decks.map((d) => d.sortOrder)).toEqual([0, 1]);
  });

  it("update() writes new fields to the deck and updates in-memory state", async () => {
    await useDecksStore.getState().create({ name: "Old", emoji: "📚", description: null, coverImage: null });
    const before = useDecksStore.getState().decks[0];
    await useDecksStore.getState().update(before.id, { name: "New", emoji: "🌿" });
    const after = useDecksStore.getState().decks[0];
    expect(after.name).toBe("New");
    expect(after.emoji).toBe("🌿");
    expect(after.updatedAt).toBeGreaterThanOrEqual(before.updatedAt);
    expect(fakeDb.ran.some((r) => /^UPDATE decks SET/i.test(r.sql))).toBe(true);
  });

  it("update() throws when the deck id does not exist", async () => {
    await useDecksStore.getState().load();
    await expect(
      useDecksStore.getState().update("missing-id", { name: "X" })
    ).rejects.toThrow(/no deck/i);
  });

  it("delete() removes the deck from SQLite and in-memory state", async () => {
    await useDecksStore.getState().create({ name: "A", emoji: null, description: null, coverImage: null });
    const id = useDecksStore.getState().decks[0].id;
    await useDecksStore.getState().delete(id);
    expect(useDecksStore.getState().decks).toEqual([]);
    expect(fakeDb.ran.some((r) => /^DELETE FROM decks/i.test(r.sql))).toBe(true);
  });

  it("reorder() rewrites sort_order across all listed ids", async () => {
    await useDecksStore.getState().create({ name: "A", emoji: null, description: null, coverImage: null });
    await useDecksStore.getState().create({ name: "B", emoji: null, description: null, coverImage: null });
    await useDecksStore.getState().create({ name: "C", emoji: null, description: null, coverImage: null });

    const decks = useDecksStore.getState().decks;
    const ids = decks.map((d) => d.id);
    // current order corresponds to creation order; reorder to [3rd, 1st, 2nd]
    await useDecksStore.getState().reorder([ids[2], ids[0], ids[1]]);

    const reordered = useDecksStore.getState().decks;
    expect(reordered.map((d) => d.id)).toEqual([ids[2], ids[0], ids[1]]);
    expect(reordered.map((d) => d.sortOrder)).toEqual([0, 1, 2]);
    expect(fakeDb.ran.filter((r) => /^UPDATE decks SET sort_order/i.test(r.sql)).length).toBe(3);
  });

  it("reorder() rejects when the id list length doesn't match the deck count", async () => {
    await useDecksStore.getState().create({ name: "A", emoji: null, description: null, coverImage: null });
    await expect(useDecksStore.getState().reorder([])).rejects.toThrow(/order length/i);
  });
});
