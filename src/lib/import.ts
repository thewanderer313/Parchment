import * as FileSystem from "expo-file-system";
import type { Deck } from "@/store/decksStore";
import { useDecksStore } from "@/store/decksStore";
import { useCardsStore } from "@/store/cardsStore";
import { newUuid } from "./uuid";

export interface ImportCardData {
  id: string;
  front_text: string;
  front_images: string[];
  back_text: string;
  back_images: string[];
}

export interface ImportDeckData {
  id: string;
  name: string;
  emoji: string | null;
  description: string | null;
  cover_image: string | null;
  cards: ImportCardData[];
}

export interface ImportPlanEntry {
  deck: ImportDeckData;
  collision: boolean;
  existingName: string | null;
}

export interface ImportPlan {
  entries: ImportPlanEntry[];
}

export type ResolveDecision = "keep" | "replace" | "skip";

export function parseAndPlanImport(body: string, existingDecks: Deck[]): ImportPlan {
  let parsed: unknown;
  try { parsed = JSON.parse(body); } catch {
    throw new Error("Invalid file: not valid JSON");
  }
  const obj = parsed as { format?: string; decks?: ImportDeckData[] };
  if (obj.format !== "parchment.v1") {
    throw new Error("Invalid file: missing or unsupported format field");
  }
  if (!Array.isArray(obj.decks)) {
    throw new Error("Invalid file: decks array missing");
  }
  const byId = new Map(existingDecks.map((d) => [d.id, d]));
  const entries: ImportPlanEntry[] = obj.decks.map((d) => {
    const existing = byId.get(d.id);
    return {
      deck: d,
      collision: !!existing,
      existingName: existing?.name ?? null,
    };
  });
  return { entries };
}

const DOC_DIR = (FileSystem as unknown as { documentDirectory: string | null }).documentDirectory ?? "";
const IMAGE_DIR = `${DOC_DIR}images/`;

async function ensureImageDir() {
  try {
    const info = await FileSystem.getInfoAsync(IMAGE_DIR);
    if (!info.exists) await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
  } catch {}
}

async function dataUriToFile(uri: string, prefix?: string): Promise<string> {
  const m = /^data:image\/[a-z]+;base64,(.*)$/i.exec(uri);
  if (!m) return uri;
  await ensureImageDir();
  const tag = prefix ? `${prefix}_` : "";
  const dest = `${IMAGE_DIR}${tag}${newUuid()}.jpg`;
  await FileSystem.writeAsStringAsync(dest, m[1], { encoding: "base64" as never });
  return dest;
}

export async function applyImport(
  entries: ImportPlanEntry[],
  decisions: Record<string, ResolveDecision>
): Promise<void> {
  const decksApi = useDecksStore.getState();
  const cardsApi = useCardsStore.getState();
  for (const entry of entries) {
    const decision = decisions[entry.deck.id] ?? "keep";
    if (decision === "skip") continue;
    if (decision === "replace" && entry.collision) {
      await decksApi.delete(entry.deck.id);
    }
    const coverImage = entry.deck.cover_image
      ? await dataUriToFile(entry.deck.cover_image, "cover")
      : null;
    const created = await decksApi.create({
      name: entry.deck.name + (decision === "keep" && entry.collision ? " (imported)" : ""),
      emoji: entry.deck.emoji,
      description: entry.deck.description,
      coverImage,
    });
    for (const card of entry.deck.cards) {
      const frontImages = await Promise.all(card.front_images.map((u) => dataUriToFile(u, "card")));
      const backImages = await Promise.all(card.back_images.map((u) => dataUriToFile(u, "card")));
      await cardsApi.create(created.id, {
        frontText: card.front_text,
        frontImages,
        backText: card.back_text,
        backImages,
      });
    }
  }
}
