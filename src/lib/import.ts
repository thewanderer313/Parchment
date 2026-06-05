// /legacy entry — the main "expo-file-system" entry's re-exports throw at
// runtime in SDK 56. See src/lib/export.ts for the same workaround.
import * as FileSystem from "expo-file-system/legacy";
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
  // Strip any UTF-8 BOM and trim whitespace before parsing. Messaging apps,
  // email clients, and Drive sometimes prefix files with a BOM or add a
  // trailing newline, both of which make a strict JSON.parse throw.
  const cleaned = body.replace(/^﻿/, "").trim();
  if (cleaned.length === 0) {
    throw new Error("Invalid file: the file is empty");
  }
  let parsed: unknown;
  try { parsed = JSON.parse(cleaned); } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    throw new Error(`Invalid file: not valid JSON (${reason})`);
  }
  const obj = parsed as { format?: string; decks?: ImportDeckData[] };
  if (obj.format !== "parchment.v1") {
    throw new Error(
      `Invalid file: this isn't a Parchment export (expected format "parchment.v1", got "${obj.format ?? "missing"}")`
    );
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

const DOC_DIR = FileSystem.documentDirectory ?? "";
const IMAGE_DIR = `${DOC_DIR}images/`;

async function ensureImageDir() {
  try {
    const info = await FileSystem.getInfoAsync(IMAGE_DIR);
    if (!info.exists) await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
  } catch {}
}

async function dataUriToFile(uri: string, prefix?: string): Promise<string> {
  // Capture the subtype so we know whether the payload is a GIF (which
  // must keep its .gif extension or expo-image won't animate it) or
  // something we can safely write as .jpg.
  const m = /^data:image\/([a-z]+);base64,(.*)$/i.exec(uri);
  if (!m) return uri;
  const subtype = m[1].toLowerCase();
  const ext = subtype === "gif" ? "gif" : "jpg";
  await ensureImageDir();
  const tag = prefix ? `${prefix}_` : "";
  const dest = `${IMAGE_DIR}${tag}${newUuid()}.${ext}`;
  await FileSystem.writeAsStringAsync(dest, m[2], {
    encoding: FileSystem.EncodingType.Base64,
  });
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
