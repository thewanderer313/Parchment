import { useDecksStore } from "../decksStore";
import { getDatabase } from "@/db/client";

interface DeckRow {
  id: string; name: string; emoji: string | null; description: string | null;
  cover_image: string | null; shuffle_enabled: number; sort_order: number;
  created_at: number; updated_at: number;
}

const fakeDb = {
  rows: [] as DeckRow[],
  async getAllAsync<T>(_sql: string): Promise<T[]> {
    return this.rows as unknown as T[];
  },
};

jest.mock("@/db/client", () => ({
  getDatabase: jest.fn(),
}));

const mockedGetDatabase = jest.mocked(getDatabase);

describe("decksStore", () => {
  beforeEach(() => {
    fakeDb.rows = [];
    useDecksStore.setState({ decks: [], status: "idle" });
    mockedGetDatabase.mockReset();
    mockedGetDatabase.mockResolvedValue(fakeDb as never);
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
    };
    mockedGetDatabase.mockResolvedValueOnce(failingDb as never);

    await expect(useDecksStore.getState().load()).rejects.toThrow("db boom");
    expect(useDecksStore.getState().status).toBe("error");
  });
});
