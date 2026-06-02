import { create as createStore } from "zustand";
import { getDatabase } from "@/db/client";
import { newUuid } from "@/lib/uuid";

export interface Deck {
  id: string;
  name: string;
  emoji: string | null;
  description: string | null;
  coverImage: string | null;
  shuffleEnabled: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

interface DeckRow {
  id: string;
  name: string;
  emoji: string | null;
  description: string | null;
  cover_image: string | null;
  shuffle_enabled: number;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

type Status = "idle" | "loading" | "ready" | "error";

export interface DeckInput {
  name: string;
  emoji: string | null;
  description: string | null;
  coverImage: string | null;
}

export interface DeckUpdate {
  name?: string;
  emoji?: string | null;
  description?: string | null;
  coverImage?: string | null;
}

interface DecksState {
  decks: Deck[];
  status: Status;
  load: () => Promise<void>;
  create: (input: DeckInput) => Promise<Deck>;
  update: (id: string, patch: DeckUpdate) => Promise<void>;
  delete: (id: string) => Promise<void>;
}

function rowToDeck(r: DeckRow): Deck {
  return {
    id: r.id,
    name: r.name,
    emoji: r.emoji,
    description: r.description,
    coverImage: r.cover_image,
    shuffleEnabled: r.shuffle_enabled === 1,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

interface RunnableDb {
  getAllAsync<T>(sql: string): Promise<T[]>;
  runAsync(sql: string, ...params: unknown[]): Promise<unknown>;
}

function asRunnable(db: unknown): RunnableDb {
  return db as RunnableDb;
}

export const useDecksStore = createStore<DecksState>((set, get) => ({
  decks: [],
  status: "idle",
  async load() {
    set({ status: "loading" });
    try {
      const db = asRunnable(await getDatabase());
      const rows = await db.getAllAsync<DeckRow>(
        "SELECT * FROM decks ORDER BY sort_order ASC, created_at ASC;"
      );
      set({ decks: rows.map(rowToDeck), status: "ready" });
    } catch (e) {
      set({ status: "error" });
      throw e;
    }
  },
  async create(input) {
    const db = asRunnable(await getDatabase());
    const id = newUuid();
    const now = Date.now();
    const sortOrder = get().decks.length;
    await db.runAsync(
      `INSERT INTO decks
       (id, name, emoji, description, cover_image, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      id, input.name, input.emoji, input.description, input.coverImage, sortOrder, now, now
    );
    const deck: Deck = {
      id, name: input.name, emoji: input.emoji, description: input.description,
      coverImage: input.coverImage, shuffleEnabled: false,
      sortOrder, createdAt: now, updatedAt: now,
    };
    set({ decks: [...get().decks, deck] });
    return deck;
  },
  async update(id, patch) {
    const existing = get().decks.find((d) => d.id === id);
    if (!existing) throw new Error(`No deck with id ${id}`);
    const db = asRunnable(await getDatabase());
    const now = Date.now();
    const next: Deck = {
      ...existing,
      name: patch.name ?? existing.name,
      emoji: patch.emoji !== undefined ? patch.emoji : existing.emoji,
      description: patch.description !== undefined ? patch.description : existing.description,
      coverImage: patch.coverImage !== undefined ? patch.coverImage : existing.coverImage,
      updatedAt: now,
    };
    await db.runAsync(
      `UPDATE decks SET name = ?, emoji = ?, description = ?, cover_image = ?, updated_at = ? WHERE id = ?;`,
      next.name, next.emoji, next.description, next.coverImage, now, id
    );
    set({ decks: get().decks.map((d) => (d.id === id ? next : d)) });
  },
  async delete(id) {
    const db = asRunnable(await getDatabase());
    await db.runAsync("DELETE FROM decks WHERE id = ?;", id);
    set({ decks: get().decks.filter((d) => d.id !== id) });
  },
}));
