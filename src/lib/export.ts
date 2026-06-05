// /legacy entry exposes the string-path file API; importing from the main
// "expo-file-system" entry calls deprecation shims that throw at runtime.
import * as FileSystem from "expo-file-system/legacy";
import type { Deck } from "@/store/decksStore";
import type { Card } from "@/store/cardsStore";

async function readAsDataUri(path: string): Promise<string> {
  const b64 = await FileSystem.readAsStringAsync(path, {
    encoding: FileSystem.EncodingType.Base64,
  });
  // Pick the MIME type from the file extension so animated GIFs round-
  // trip correctly through the export/import flow. The picker / importer
  // both preserve the original extension when writing to disk, so the
  // extension reliably reflects content type here.
  const lower = path.toLowerCase();
  const mime = lower.endsWith(".gif") ? "image/gif" : "image/jpeg";
  return `data:${mime};base64,${b64}`;
}

async function deckToExport(deck: Deck, cards: Card[]) {
  const cover_image = deck.coverImage ? await readAsDataUri(deck.coverImage) : null;
  const exportedCards = await Promise.all(cards.map(async (c) => ({
    id: c.id,
    front_text: c.frontText,
    front_images: await Promise.all(c.frontImages.map(readAsDataUri)),
    back_text: c.backText,
    back_images: await Promise.all(c.backImages.map(readAsDataUri)),
  })));
  return {
    id: deck.id,
    name: deck.name,
    emoji: deck.emoji,
    description: deck.description,
    cover_image,
    cards: exportedCards,
  };
}

export async function exportLibrary(decks: Deck[], cardsByDeck: Record<string, Card[]>): Promise<string> {
  const exported = await Promise.all(
    decks.map((d) => deckToExport(d, cardsByDeck[d.id] ?? []))
  );
  return JSON.stringify({
    format: "parchment.v1",
    exported_at: Date.now(),
    decks: exported,
  });
}

export async function exportDeck(deckId: string, decks: Deck[], cardsByDeck: Record<string, Card[]>): Promise<string> {
  const deck = decks.find((d) => d.id === deckId);
  if (!deck) throw new Error(`No deck with id ${deckId}`);
  const exported = await deckToExport(deck, cardsByDeck[deck.id] ?? []);
  return JSON.stringify({
    format: "parchment.v1",
    exported_at: Date.now(),
    decks: [exported],
  });
}
