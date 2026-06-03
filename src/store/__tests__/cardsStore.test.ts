import { useCardsStore } from "../cardsStore";
import { getDatabase } from "@/db/client";

interface CardRow {
  id: string; deck_id: string;
  front_text: string; front_images: string;
  back_text: string; back_images: string;
  sort_order: number; created_at: number; updated_at: number;
}

const fakeDb = {
  rows: [] as CardRow[],
  ran: [] as { sql: string; params: unknown[] }[],
  async withTransactionAsync(cb: () => Promise<void>) { await cb(); },
  async getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]> {
    if (sql.includes("WHERE deck_id = ?")) {
      const [deckId] = params as [string];
      return this.rows
        .filter((r) => r.deck_id === deckId)
        .sort((a, b) => a.sort_order - b.sort_order) as unknown as T[];
    }
    if (sql.includes("GROUP BY deck_id")) {
      const counts = new Map<string, number>();
      for (const r of this.rows) counts.set(r.deck_id, (counts.get(r.deck_id) ?? 0) + 1);
      return Array.from(counts.entries()).map(([deck_id, count]) => ({ deck_id, count })) as unknown as T[];
    }
    return [];
  },
  async runAsync(sql: string, ...params: unknown[]) {
    this.ran.push({ sql, params });
    if (/^INSERT INTO cards/i.test(sql)) {
      const [id, deck_id, front_text, front_images, back_text, back_images, sort_order, created_at, updated_at] =
        params as [string, string, string, string, string, string, number, number, number];
      this.rows.push({ id, deck_id, front_text, front_images, back_text, back_images, sort_order, created_at, updated_at });
    } else if (/^UPDATE cards SET sort_order = \?/i.test(sql)) {
      const [sort_order, updated_at, id] = params as [number, number, string];
      const row = this.rows.find((r) => r.id === id);
      if (!row) return;
      row.sort_order = sort_order;
      row.updated_at = updated_at;
    } else if (/^UPDATE cards SET/i.test(sql)) {
      const ps = params as unknown[];
      const id = ps[ps.length - 1] as string;
      const row = this.rows.find((r) => r.id === id);
      if (!row) return;
      row.front_text = ps[0] as string;
      row.front_images = ps[1] as string;
      row.back_text = ps[2] as string;
      row.back_images = ps[3] as string;
      row.updated_at = ps[4] as number;
    } else if (/^DELETE FROM cards/i.test(sql)) {
      const [id] = params as [string];
      this.rows = this.rows.filter((r) => r.id !== id);
    }
  },
};

jest.mock("@/db/client", () => ({ getDatabase: jest.fn() }));
jest.mock("@/lib/uuid", () => ({ newUuid: jest.fn() }));
const mockedGetDatabase = jest.mocked(getDatabase);
const mockedNewUuid = jest.mocked(require("@/lib/uuid").newUuid);

describe("cardsStore", () => {
  beforeEach(() => {
    fakeDb.rows = [];
    fakeDb.ran = [];
    useCardsStore.setState({ cardsByDeck: {}, counts: {} });
    mockedGetDatabase.mockReset();
    mockedGetDatabase.mockResolvedValue(fakeDb as never);
    mockedNewUuid.mockReset();
    let n = 0;
    mockedNewUuid.mockImplementation(() => `uuid-${++n}`);
  });

  it("loadByDeck returns empty when no cards exist for the deck", async () => {
    await useCardsStore.getState().loadByDeck("d1");
    expect(useCardsStore.getState().cardsByDeck["d1"]).toEqual([]);
  });

  it("loadByDeck maps snake_case rows including JSON-array image columns", async () => {
    fakeDb.rows = [
      { id: "c1", deck_id: "d1", front_text: "**hi**", front_images: '["img/a.jpg"]',
        back_text: "back", back_images: "[]", sort_order: 0, created_at: 1, updated_at: 1 },
    ];
    await useCardsStore.getState().loadByDeck("d1");
    const cards = useCardsStore.getState().cardsByDeck["d1"];
    expect(cards).toHaveLength(1);
    expect(cards[0]).toEqual({
      id: "c1", deckId: "d1",
      frontText: "**hi**", frontImages: ["img/a.jpg"],
      backText: "back", backImages: [],
      sortOrder: 0, createdAt: 1, updatedAt: 1,
    });
  });

  it("create() inserts a card with sort_order = number of cards in deck", async () => {
    await useCardsStore.getState().create("d1", {
      frontText: "Q1", frontImages: [], backText: "A1", backImages: [],
    });
    await useCardsStore.getState().create("d1", {
      frontText: "Q2", frontImages: [], backText: "A2", backImages: [],
    });
    const cards = useCardsStore.getState().cardsByDeck["d1"];
    expect(cards.map((c) => c.sortOrder)).toEqual([0, 1]);
    expect(cards.map((c) => c.frontText)).toEqual(["Q1", "Q2"]);
  });

  it("update() patches front/back text and images via SQL UPDATE", async () => {
    await useCardsStore.getState().create("d1", { frontText: "Q1", frontImages: [], backText: "A1", backImages: [] });
    const id = useCardsStore.getState().cardsByDeck["d1"][0].id;
    await useCardsStore.getState().update(id, {
      frontText: "Q1!", frontImages: ["img/x.jpg"], backText: "A1!", backImages: [],
    });
    const c = useCardsStore.getState().cardsByDeck["d1"][0];
    expect(c.frontText).toBe("Q1!");
    expect(c.frontImages).toEqual(["img/x.jpg"]);
    expect(c.backText).toBe("A1!");
  });

  it("delete() removes the card from store and SQLite", async () => {
    await useCardsStore.getState().create("d1", { frontText: "Q1", frontImages: [], backText: "A1", backImages: [] });
    const id = useCardsStore.getState().cardsByDeck["d1"][0].id;
    await useCardsStore.getState().delete(id, "d1");
    expect(useCardsStore.getState().cardsByDeck["d1"]).toEqual([]);
    expect(fakeDb.ran.some((r) => /^DELETE FROM cards/i.test(r.sql))).toBe(true);
  });

  it("loadCounts populates counts by deck_id from a GROUP BY query", async () => {
    await useCardsStore.getState().create("d1", { frontText: "Q1", frontImages: [], backText: "A1", backImages: [] });
    await useCardsStore.getState().create("d1", { frontText: "Q2", frontImages: [], backText: "A2", backImages: [] });
    await useCardsStore.getState().create("d2", { frontText: "Q3", frontImages: [], backText: "A3", backImages: [] });
    await useCardsStore.getState().loadCounts();
    expect(useCardsStore.getState().counts).toEqual({ d1: 2, d2: 1 });
  });

  it("reorder() rewrites sort_order across all listed ids", async () => {
    await useCardsStore.getState().create("d1", { frontText: "A", frontImages: [], backText: "X", backImages: [] });
    await useCardsStore.getState().create("d1", { frontText: "B", frontImages: [], backText: "Y", backImages: [] });
    await useCardsStore.getState().create("d1", { frontText: "C", frontImages: [], backText: "Z", backImages: [] });

    const ids = useCardsStore.getState().cardsByDeck["d1"].map((c) => c.id);
    await useCardsStore.getState().reorder("d1", [ids[2], ids[0], ids[1]]);

    const reordered = useCardsStore.getState().cardsByDeck["d1"];
    expect(reordered.map((c) => c.id)).toEqual([ids[2], ids[0], ids[1]]);
    expect(reordered.map((c) => c.sortOrder)).toEqual([0, 1, 2]);
    expect(
      fakeDb.ran.filter((r) => /^UPDATE cards SET sort_order/i.test(r.sql)).length
    ).toBe(3);
  });

  it("reorder() rejects when the id list length doesn't match the card count", async () => {
    await useCardsStore.getState().create("d1", { frontText: "A", frontImages: [], backText: "X", backImages: [] });
    await expect(
      useCardsStore.getState().reorder("d1", [])
    ).rejects.toThrow(/order length/i);
  });

  it("reorder() rejects when an id in the list is unknown", async () => {
    await useCardsStore.getState().create("d1", { frontText: "A", frontImages: [], backText: "X", backImages: [] });
    await expect(
      useCardsStore.getState().reorder("d1", ["does-not-exist"])
    ).rejects.toThrow(/unknown id/i);
  });
});
