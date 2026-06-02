import { create } from "zustand";
import { getDatabase } from "@/db/client";

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

interface DecksState {
  decks: Deck[];
  status: Status;
  load: () => Promise<void>;
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

export const useDecksStore = create<DecksState>((set) => ({
  decks: [],
  status: "idle",
  async load() {
    set({ status: "loading" });
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<DeckRow>(
        "SELECT * FROM decks ORDER BY sort_order ASC, created_at ASC;"
      );
      set({ decks: rows.map(rowToDeck), status: "ready" });
    } catch (e) {
      set({ status: "error" });
      throw e;
    }
  },
}));
