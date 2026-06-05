// Visual layout helpers for the Study tab's bookshelf.
//
// Each deck becomes a "book" on a shelf. Height and spine color are
// derived from a stable hash of the deck id so the same deck always
// looks the same (same colour, same height). Width tracks CARD COUNT
// on a log curve so a 200-card deck stands visibly thicker than a
// 10-card one — like real books on a shelf where thicker spines hold
// more pages — with a small id-based jitter on top so two decks with
// the same count don't look identical.
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
// Card-count anchor: at and beyond this many cards the spine is at
// SPINE_MAX_WIDTH. Chosen so a "fat textbook" feel kicks in around
// 200 cards while preserving room for a handful of books per shelf.
const WIDTH_MAX_CARDS = 200;

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

// Fallback emblem glyphs for spines whose deck has no emoji. A curated
// mix of fleurons, diamonds, and stars — picked because they all
// render as serif text glyphs on every platform (no risk of one
// turning into a colour emoji on iOS) and because at 16 pt they read
// as "old book spine stamping" rather than UI icon. The deck id hash
// picks an index so each emoji-less deck stays visually distinct but
// stable across renders, instead of a wall of identical ✦'s.
export const SPINE_FALLBACK_EMBLEMS = ["❦", "❧", "❖", "✦", "◆", "❉"] as const;

export interface SpineDims {
  width: number;
  height: number;
  color: string;
  /** Glyph to display at the head of the spine when the deck has no
   *  emoji. Deterministic per deck id. */
  fallbackEmblem: string;
}

// Map card count → spine width on a log curve so small differences at
// the low end (3 vs 15 cards) are visible but large differences at the
// high end (250 vs 500 cards) don't run away. The +1 inside log avoids
// log(0) and lifts the 0-card case off the floor; min() caps so a
// 1000-card deck doesn't dominate the shelf.
function widthForCardCount(cardCount: number): number {
  const clamped = Math.max(0, Math.min(WIDTH_MAX_CARDS, cardCount));
  const ratio = Math.log(1 + clamped) / Math.log(1 + WIDTH_MAX_CARDS);
  return SPINE_MIN_WIDTH + (SPINE_MAX_WIDTH - SPINE_MIN_WIDTH) * ratio;
}

export function dimsForDeck(deck: Deck, cardCount: number): SpineDims {
  const h = hashId(deck.id);
  // Width = card-count base + a small ±3 px hash-driven jitter so two
  // decks with the same card count don't look perfectly identical on
  // the shelf. Clamped back into [MIN, MAX] in case the jitter would
  // push it out.
  const base = widthForCardCount(cardCount);
  const jitter = (h % 7) - 3; // -3..+3
  const width = Math.max(
    SPINE_MIN_WIDTH,
    Math.min(SPINE_MAX_WIDTH, Math.round(base + jitter))
  );
  const height = SPINE_MIN_HEIGHT + ((h >> 8) % (SPINE_MAX_HEIGHT - SPINE_MIN_HEIGHT + 1));
  const color = SPINE_COLORS[(h >> 16) % SPINE_COLORS.length];
  // High bits of the hash are still untouched (width used low 3 bits,
  // height used next 6, color used next 3) — use shift 24 to pick the
  // fallback emblem from a slice the previous picks haven't already
  // depended on.
  const fallbackEmblem =
    SPINE_FALLBACK_EMBLEMS[(h >>> 24) % SPINE_FALLBACK_EMBLEMS.length];
  return { width, height, color, fallbackEmblem };
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

export function packIntoShelves(
  decks: Deck[],
  counts: Record<string, number>,
  shelfWidth: number
): ShelfRow[] {
  const rows: ShelfRow[] = [];
  let current: ShelfRow["books"] = [];
  let currentWidth = 0;
  for (const deck of decks) {
    const dims = dimsForDeck(deck, counts[deck.id] ?? 0);
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
