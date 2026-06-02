import { parseAndPlanImport } from "../import";

const fileBody = JSON.stringify({
  format: "parchment.v1",
  exported_at: 1000,
  decks: [
    {
      id: "d-new", name: "French", emoji: "🇫🇷", description: null, cover_image: null,
      cards: [
        { id: "c1", front_text: "bonjour", front_images: [], back_text: "hello", back_images: [] },
      ],
    },
  ],
});

describe("parseAndPlanImport", () => {
  it("returns an ImportPlan with one entry per deck in the file", () => {
    const plan = parseAndPlanImport(fileBody, []);
    expect(plan.entries).toHaveLength(1);
    expect(plan.entries[0].deck.name).toBe("French");
    expect(plan.entries[0].collision).toBe(false);
  });

  it("flags an entry as collision when an existing deck has the same id", () => {
    const plan = parseAndPlanImport(fileBody, [
      { id: "d-new", name: "Old French", emoji: null, description: null, coverImage: null,
        shuffleEnabled: false, sortOrder: 0, createdAt: 0, updatedAt: 0 },
    ]);
    expect(plan.entries[0].collision).toBe(true);
    expect(plan.entries[0].existingName).toBe("Old French");
  });

  it("rejects files with a missing or wrong format field", () => {
    expect(() => parseAndPlanImport("{}", [])).toThrow(/format/i);
  });

  it("rejects files that are not valid JSON", () => {
    expect(() => parseAndPlanImport("not-json", [])).toThrow(/invalid/i);
  });

  it("rejects files with a non-array decks field", () => {
    const bad = JSON.stringify({ format: "parchment.v1", decks: "oops" });
    expect(() => parseAndPlanImport(bad, [])).toThrow(/decks/i);
  });
});

import { applyImport, type ImportPlanEntry } from "../import";

const mockDecksCreate = jest.fn(async (input: { name: string }) => ({
  id: "new-deck-id",
  ...input,
}));
const mockDecksDelete = jest.fn();
const mockCardsCreate = jest.fn();

jest.mock("@/store/decksStore", () => ({
  useDecksStore: {
    getState: jest.fn(() => ({
      create: mockDecksCreate,
      delete: mockDecksDelete,
    })),
  },
}));
jest.mock("@/store/cardsStore", () => ({
  useCardsStore: {
    getState: jest.fn(() => ({
      create: mockCardsCreate,
    })),
  },
}));
jest.mock("expo-file-system", () => ({
  writeAsStringAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  getInfoAsync: jest.fn(async () => ({ exists: true })),
  documentDirectory: "file:///doc/",
  EncodingType: { Base64: "base64" },
}));

describe("applyImport", () => {
  beforeEach(() => {
    mockDecksCreate.mockClear();
    mockDecksDelete.mockClear();
    mockCardsCreate.mockClear();
  });

  it("creates a new deck and its cards for a non-collision entry resolved as keep", async () => {
    const entry: ImportPlanEntry = {
      deck: {
        id: "d-new", name: "French", emoji: "🇫🇷", description: null, cover_image: null,
        cards: [{ id: "c1", front_text: "bonjour", front_images: [], back_text: "hello", back_images: [] }],
      },
      collision: false,
      existingName: null,
    };
    await applyImport([entry], { "d-new": "keep" });
    expect(mockDecksCreate).toHaveBeenCalledWith(expect.objectContaining({ name: "French" }));
    expect(mockCardsCreate).toHaveBeenCalledWith("new-deck-id", expect.objectContaining({ frontText: "bonjour" }));
  });

  it("appends ' (imported)' to the deck name when collision is true and decision is keep", async () => {
    const entry: ImportPlanEntry = {
      deck: { id: "d1", name: "Spanish", emoji: null, description: null, cover_image: null, cards: [] },
      collision: true,
      existingName: "Spanish",
    };
    await applyImport([entry], { d1: "keep" });
    expect(mockDecksCreate).toHaveBeenCalledWith(expect.objectContaining({ name: "Spanish (imported)" }));
  });

  it("deletes the existing deck and creates a fresh one when decision is replace", async () => {
    const entry: ImportPlanEntry = {
      deck: { id: "d1", name: "Spanish", emoji: null, description: null, cover_image: null, cards: [] },
      collision: true,
      existingName: "Spanish",
    };
    await applyImport([entry], { d1: "replace" });
    expect(mockDecksDelete).toHaveBeenCalledWith("d1");
    expect(mockDecksCreate).toHaveBeenCalledWith(expect.objectContaining({ name: "Spanish" }));
  });

  it("skips an entry resolved as skip", async () => {
    const entry: ImportPlanEntry = {
      deck: { id: "d1", name: "X", emoji: null, description: null, cover_image: null, cards: [] },
      collision: true,
      existingName: "X",
    };
    await applyImport([entry], { d1: "skip" });
    expect(mockDecksCreate).not.toHaveBeenCalled();
  });
});
