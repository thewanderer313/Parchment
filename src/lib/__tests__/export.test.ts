import { exportLibrary, exportDeck } from "../export";
import type { Deck } from "@/store/decksStore";
import type { Card } from "@/store/cardsStore";

const deck: Deck = {
  id: "d1", name: "Spanish", emoji: "🌿", description: null,
  coverImage: null, shuffleEnabled: false, sortOrder: 0,
  createdAt: 1000, updatedAt: 1000,
};
const card: Card = {
  id: "c1", deckId: "d1",
  frontText: "hola", frontImages: [],
  backText: "hello", backImages: [],
  sortOrder: 0, createdAt: 1000, updatedAt: 1000,
};

jest.mock("expo-file-system", () => ({
  readAsStringAsync: jest.fn(async (path: string) => `base64-of-${path}`),
  EncodingType: { Base64: "base64" },
  documentDirectory: "file:///doc/",
}));

describe("export", () => {
  it("exportLibrary returns a parchment.v1 envelope with decks + nested cards", async () => {
    const out = await exportLibrary([deck], { d1: [card] });
    const parsed = JSON.parse(out);
    expect(parsed.format).toBe("parchment.v1");
    expect(parsed.exported_at).toEqual(expect.any(Number));
    expect(parsed.decks).toHaveLength(1);
    expect(parsed.decks[0].id).toBe("d1");
    expect(parsed.decks[0].cards).toHaveLength(1);
    expect(parsed.decks[0].cards[0].id).toBe("c1");
  });

  it("exportDeck only includes the chosen deck and its cards", async () => {
    const decks: Deck[] = [deck, { ...deck, id: "d2", name: "French" }];
    const out = await exportDeck("d1", decks, { d1: [card], d2: [] });
    const parsed = JSON.parse(out);
    expect(parsed.decks).toHaveLength(1);
    expect(parsed.decks[0].id).toBe("d1");
  });

  it("inlines images as base64 data URIs when a card has image paths", async () => {
    const cardWithImage: Card = { ...card, frontImages: ["file:///doc/images/a.jpg"] };
    const out = await exportLibrary([deck], { d1: [cardWithImage] });
    const parsed = JSON.parse(out);
    expect(parsed.decks[0].cards[0].front_images[0]).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("inlines deck cover_image when present", async () => {
    const withCover: Deck = { ...deck, coverImage: "file:///doc/images/cover_x.jpg" };
    const out = await exportLibrary([withCover], { d1: [] });
    const parsed = JSON.parse(out);
    expect(parsed.decks[0].cover_image).toMatch(/^data:image\/jpeg;base64,/);
  });
});
