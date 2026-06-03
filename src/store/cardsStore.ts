import { create as createStore } from "zustand";
import { getDatabase } from "@/db/client";
import { newUuid } from "@/lib/uuid";

export interface Card {
  id: string;
  deckId: string;
  frontText: string;
  frontImages: string[];
  backText: string;
  backImages: string[];
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

interface CardRow {
  id: string; deck_id: string;
  front_text: string; front_images: string;
  back_text: string; back_images: string;
  sort_order: number; created_at: number; updated_at: number;
}

export interface CardInput {
  frontText: string;
  frontImages: string[];
  backText: string;
  backImages: string[];
}

interface CardsState {
  cardsByDeck: Record<string, Card[]>;
  counts: Record<string, number>;
  loadByDeck: (deckId: string) => Promise<void>;
  loadCounts: () => Promise<void>;
  create: (deckId: string, input: CardInput) => Promise<Card>;
  update: (id: string, input: CardInput) => Promise<void>;
  delete: (id: string, deckId: string) => Promise<void>;
  reorder: (deckId: string, orderedIds: string[]) => Promise<void>;
}

interface RunnableDb {
  getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  runAsync(sql: string, ...params: unknown[]): Promise<unknown>;
  withTransactionAsync(cb: () => Promise<void>): Promise<void>;
}
function asRunnable(db: unknown): RunnableDb { return db as RunnableDb; }

function rowToCard(r: CardRow): Card {
  let frontImages: string[] = [];
  let backImages: string[] = [];
  try { frontImages = JSON.parse(r.front_images); } catch {}
  try { backImages = JSON.parse(r.back_images); } catch {}
  return {
    id: r.id, deckId: r.deck_id,
    frontText: r.front_text, frontImages,
    backText: r.back_text, backImages,
    sortOrder: r.sort_order,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

export const useCardsStore = createStore<CardsState>((set, get) => ({
  cardsByDeck: {},
  counts: {},
  async loadByDeck(deckId) {
    try {
      const db = asRunnable(await getDatabase());
      const rows = await db.getAllAsync<CardRow>(
        "SELECT * FROM cards WHERE deck_id = ? ORDER BY sort_order ASC, created_at ASC;",
        deckId
      );
      set({ cardsByDeck: { ...get().cardsByDeck, [deckId]: rows.map(rowToCard) } });
    } catch (e) {
      // Swallow inside the store so React effects (which can't easily handle
      // async rejections) don't see an unhandled rejection that may crash
      // Android in release mode. UI shows an empty card list instead.
      console.warn("cardsStore.loadByDeck failed:", e);
      set({ cardsByDeck: { ...get().cardsByDeck, [deckId]: [] } });
    }
  },
  async loadCounts() {
    try {
      const db = asRunnable(await getDatabase());
      const rows = await db.getAllAsync<{ deck_id: string; count: number }>(
        "SELECT deck_id, COUNT(*) as count FROM cards GROUP BY deck_id;"
      );
      const counts: Record<string, number> = {};
      for (const row of rows) counts[row.deck_id] = row.count;
      set({ counts });
    } catch (e) {
      console.warn("cardsStore.loadCounts failed:", e);
    }
  },
  async create(deckId, input) {
    const db = asRunnable(await getDatabase());
    const id = newUuid();
    const now = Date.now();
    const current = get().cardsByDeck[deckId] ?? [];
    const sortOrder = current.length;
    const frontImagesJson = JSON.stringify(input.frontImages);
    const backImagesJson = JSON.stringify(input.backImages);
    await db.runAsync(
      `INSERT INTO cards (id, deck_id, front_text, front_images, back_text, back_images, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      id, deckId, input.frontText, frontImagesJson, input.backText, backImagesJson, sortOrder, now, now
    );
    const card: Card = {
      id, deckId,
      frontText: input.frontText, frontImages: input.frontImages,
      backText: input.backText, backImages: input.backImages,
      sortOrder, createdAt: now, updatedAt: now,
    };
    set({
      cardsByDeck: { ...get().cardsByDeck, [deckId]: [...current, card] },
      counts: { ...get().counts, [deckId]: (get().counts[deckId] ?? 0) + 1 },
    });
    return card;
  },
  async update(id, input) {
    const db = asRunnable(await getDatabase());
    const now = Date.now();
    const frontImagesJson = JSON.stringify(input.frontImages);
    const backImagesJson = JSON.stringify(input.backImages);
    await db.runAsync(
      "UPDATE cards SET front_text = ?, front_images = ?, back_text = ?, back_images = ?, updated_at = ? WHERE id = ?;",
      input.frontText, frontImagesJson, input.backText, backImagesJson, now, id
    );
    const cbd = { ...get().cardsByDeck };
    for (const deckId of Object.keys(cbd)) {
      const idx = cbd[deckId].findIndex((c) => c.id === id);
      if (idx >= 0) {
        const updated: Card = {
          ...cbd[deckId][idx],
          frontText: input.frontText, frontImages: input.frontImages,
          backText: input.backText, backImages: input.backImages,
          updatedAt: now,
        };
        cbd[deckId] = [...cbd[deckId].slice(0, idx), updated, ...cbd[deckId].slice(idx + 1)];
      }
    }
    set({ cardsByDeck: cbd });
  },
  async delete(id, deckId) {
    const db = asRunnable(await getDatabase());
    await db.runAsync("DELETE FROM cards WHERE id = ?;", id);
    const current = get().cardsByDeck[deckId] ?? [];
    set({
      cardsByDeck: { ...get().cardsByDeck, [deckId]: current.filter((c) => c.id !== id) },
      counts: { ...get().counts, [deckId]: Math.max(0, (get().counts[deckId] ?? 0) - 1) },
    });
  },
  async reorder(deckId, orderedIds) {
    const current = get().cardsByDeck[deckId] ?? [];
    if (orderedIds.length !== current.length) {
      throw new Error(
        `reorder: order length ${orderedIds.length} != card count ${current.length}`
      );
    }
    const byId = new Map(current.map((c) => [c.id, c]));
    for (const id of orderedIds) {
      if (!byId.has(id)) throw new Error(`reorder: unknown id ${id}`);
    }
    const db = asRunnable(await getDatabase());
    const now = Date.now();
    const reordered: Card[] = orderedIds.map((id, idx) => ({
      ...(byId.get(id) as Card),
      sortOrder: idx,
      updatedAt: now,
    }));
    await db.withTransactionAsync(async () => {
      for (const c of reordered) {
        await db.runAsync(
          "UPDATE cards SET sort_order = ?, updated_at = ? WHERE id = ?;",
          c.sortOrder, c.updatedAt, c.id
        );
      }
    });
    set({ cardsByDeck: { ...get().cardsByDeck, [deckId]: reordered } });
  },
}));
