// Visual layout helpers for the Study tab's bookshelf.
//
// Each deck becomes a "book" on a shelf. Width, height, and spine color
// are derived from a stable hash of the deck id so the same deck always
// looks the same on the shelf (same spine, same color) but across many
// decks the row has visual variety — the way a real bookshelf does.
//
// `packIntoShelves` greedily packs spines into rows that fit within
// `shelfWidth`. A row gets at least one book even if the book is wider
// than the shelf (visually clipped via overflow: hidden on the row), so
// we never lose a deck off the end.

import type { Deck } from "@/store/decksStore";

const SPINE_MIN_WIDTH = 52;
const SPINE_MAX_WIDTH = 80;
const SPINE_MIN_HEIGHT = 142;
const SPINE_MAX_HEIGHT = 178;

// Curated dark leather/cloth tones — every spine reads as a real bound
// book, never as a colored UI rectangle. Cream text sits legibly on
// every one. Order doesn't matter except that adjacent indices should
// be visually distinct to avoid two same-colored spines next to each
// other for short id-spaces.
export const SPINE_COLORS = [
  "#2d3f30", // deep forest
  "#5a2a2a", // burgundy
  "#2a3a52", // navy ink
  "#5a3a25", // leather brown
  "#3a4a3e", // slate green
  "#6a521e", // aged ochre
  "#2a4040", // deep teal
  "#482a44", // plum
];

export const SPINE_LABEL_COLOR = "#f0e6cf"; // warm parchment cream
export const SPINE_LABEL_DIM = "#cdbf94";   // muted version for caption

function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Drop the sign bit to keep modulo math positive.
  return h >>> 0;
}

export interface SpineDims {
  width: number;
  height: number;
  color: string;
}

export function dimsForDeck(deck: Deck): SpineDims {
  const h = hashId(deck.id);
  const width = SPINE_MIN_WIDTH + (h % (SPINE_MAX_WIDTH - SPINE_MIN_WIDTH + 1));
  const height = SPINE_MIN_HEIGHT + ((h >> 8) % (SPINE_MAX_HEIGHT - SPINE_MIN_HEIGHT + 1));
  const color = SPINE_COLORS[(h >> 16) % SPINE_COLORS.length];
  return { width, height, color };
}

export interface ShelfRow {
  id: string;
  books: { deck: Deck; dims: SpineDims }[];
}

// Greedy packing — walk the deck list left to right, add books to the
// current row until the next one wouldn't fit (counting an 8 px gap
// between books). Each row's id is the first deck's id so React keys
// stay stable across renders even when reordering changes pack output.
const GAP = 8;

export function packIntoShelves(decks: Deck[], shelfWidth: number): ShelfRow[] {
  const rows: ShelfRow[] = [];
  let current: ShelfRow["books"] = [];
  let currentWidth = 0;
  for (const deck of decks) {
    const dims = dimsForDeck(deck);
    const widthIfAdded = currentWidth === 0 ? dims.width : currentWidth + GAP + dims.width;
    if (current.length > 0 && widthIfAdded > shelfWidth) {
      rows.push({ id: current[0].deck.id, books: current });
      current = [];
      currentWidth = 0;
    }
    current.push({ deck, dims });
    currentWidth = current.length === 1 ? dims.width : currentWidth + GAP + dims.width;
  }
  if (current.length > 0) {
    rows.push({ id: current[0].deck.id, books: current });
  }
  return rows;
}
