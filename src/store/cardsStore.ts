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

// Result of a cross-app search — the matched card plus minimal info
// about the deck it belongs to, so the results list can show both
// without a second store lookup per row.
export interface SearchResult {
  card: Card;
  deck: { id: string; name: string; emoji: string | null };
  /** Where the match landed — surfaced so the UI can label the row
   *  ("matched in front", "matched in back", "matched in deck"). */
  matchedIn: "front" | "back" | "deck";
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
  /** Move a card from one deck to another. Lands at the bottom of
   *  the target deck's sort order; the source deck's other cards
   *  keep their relative order (gaps in sort_order are tolerated by
   *  loadByDeck since it sorts client-side after load anyway). */
  move: (id: string, fromDeckId: string, toDeckId: string) => Promise<void>;
  /** Free-text search across every card and deck. Matches against
   *  card front/back text and deck name/description. Returns at most
   *  100 results ordered by most-recently-updated. */
  searchCards: (query: string) => Promise<SearchResult[]>;
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
  async move(id, fromDeckId, toDeckId) {
    if (fromDeckId === toDeckId) return;
    const db = asRunnable(await getDatabase());
    // Determine the new sort order = max(existing) + 1 in target.
    // If the target deck has no cards yet, MAX returns null which
    // JSON-decodes to null; we coerce that to -1 so the new card
    // lands at sort_order 0.
    const maxRows = await db.getAllAsync<{ max_so: number | null }>(
      "SELECT MAX(sort_order) AS max_so FROM cards WHERE deck_id = ?;",
      toDeckId
    );
    const nextSort = ((maxRows[0]?.max_so ?? -1) as number) + 1;
    const now = Date.now();
    await db.runAsync(
      "UPDATE cards SET deck_id = ?, sort_order = ?, updated_at = ? WHERE id = ?;",
      toDeckId, nextSort, now, id
    );
    // In-memory updates: remove from fromDeck's list, append to
    // toDeck's list (only if the target was already loaded — if not,
    // loadByDeck will pull the card the next time the deck is viewed).
    const cbd = { ...get().cardsByDeck };
    const counts = { ...get().counts };
    const fromList = cbd[fromDeckId] ?? [];
    const movedIdx = fromList.findIndex((c) => c.id === id);
    let moved: Card | undefined;
    if (movedIdx >= 0) {
      moved = { ...fromList[movedIdx], deckId: toDeckId, sortOrder: nextSort, updatedAt: now };
      cbd[fromDeckId] = [...fromList.slice(0, movedIdx), ...fromList.slice(movedIdx + 1)];
    }
    if (cbd[toDeckId]) {
      if (moved) {
        cbd[toDeckId] = [...cbd[toDeckId], moved];
      } else {
        // Target was loaded but we didn't have the card in memory —
        // safest is to invalidate so the next visit pulls fresh.
        delete cbd[toDeckId];
      }
    }
    counts[fromDeckId] = Math.max(0, (counts[fromDeckId] ?? 0) - 1);
    counts[toDeckId] = (counts[toDeckId] ?? 0) + 1;
    set({ cardsByDeck: cbd, counts });
  },
  async searchCards(query) {
    const trimmed = query.trim();
    if (trimmed.length === 0) return [];
    const db = asRunnable(await getDatabase());
    // SQLite LIKE is case-insensitive for ASCII. We bind a single
    // pattern with leading + trailing wildcards. Joining with decks
    // lets us include matches on deck name/description in the same
    // pass — and gives the result list the deck context the UI
    // needs without a second query per row.
    const pattern = `%${trimmed}%`;
    interface JoinedRow extends CardRow {
      deck_name: string;
      deck_emoji: string | null;
      deck_description: string | null;
    }
    let rows: JoinedRow[] = [];
    try {
      rows = await db.getAllAsync<JoinedRow>(
        `SELECT c.*, d.name AS deck_name, d.emoji AS deck_emoji,
                d.description AS deck_description
           FROM cards c
           JOIN decks d ON c.deck_id = d.id
          WHERE c.front_text LIKE ?
             OR c.back_text  LIKE ?
             OR d.name       LIKE ?
             OR d.description LIKE ?
          ORDER BY c.updated_at DESC
          LIMIT 100;`,
        pattern, pattern, pattern, pattern
      );
    } catch (e) {
      console.warn("cardsStore.searchCards failed:", e);
      return [];
    }
    // Classify each match. Card-text wins over deck-metadata so a
    // card whose front contains the query but whose deck name also
    // contains it labels as a card hit, not a deck hit.
    const q = trimmed.toLowerCase();
    return rows.map<SearchResult>((r) => {
      const card = rowToCard(r);
      let matchedIn: SearchResult["matchedIn"] = "deck";
      if (r.front_text.toLowerCase().includes(q)) matchedIn = "front";
      else if (r.back_text.toLowerCase().includes(q)) matchedIn = "back";
      return {
        card,
        deck: { id: r.deck_id, name: r.deck_name, emoji: r.deck_emoji },
        matchedIn,
      };
    });
  },
}));
