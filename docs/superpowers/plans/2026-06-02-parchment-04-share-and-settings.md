# Parchment — Plan 04: Export, Import, Share + Settings Screen

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Full library and per-deck export to a self-contained `.parchment` JSON file (base64-inlined images). Import via OS file picker with collision handling. Share-deck on a long-press menu. New `/settings` screen with theme mode toggle + export/import + about. Home gets a gear icon.

**Architecture:** `src/lib/export.ts` and `src/lib/import.ts` are pure data-layer modules with unit tests. `src/lib/share.ts` wraps `expo-sharing` and `expo-document-picker`. The Settings screen is a normal route. The deck long-press menu in `src/app/index.tsx` gains a Share option.

**Tech Stack additions:** `expo-document-picker`.

---

## Task 1: Export module (TDD)

**Files:**
- Create: `src/lib/export.ts`
- Create: `src/lib/__tests__/export.test.ts`

### Red

```typescript
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
```

### Green

```typescript
import * as FileSystem from "expo-file-system";
import type { Deck } from "@/store/decksStore";
import type { Card } from "@/store/cardsStore";

async function readAsDataUri(path: string): Promise<string> {
  const b64 = await FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.Base64 });
  return `data:image/jpeg;base64,${b64}`;
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
```

Commit (red+green).

---

## Task 2: Import module (TDD)

**Files:**
- Create: `src/lib/import.ts`
- Create: `src/lib/__tests__/import.test.ts`

### Red

```typescript
import { parseAndPlanImport, type ImportPlan } from "../import";

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
});
```

### Green

```typescript
import type { Deck } from "@/store/decksStore";

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
```

Commit (red+green).

---

## Task 3: applyImport (TDD)

Continue building on import.ts: add a function that writes the planned imports to the DB and decodes inlined images back to files.

### Test additions (append to existing test file)

```typescript
import { applyImport } from "../import";
import { useDecksStore } from "@/store/decksStore";
import { useCardsStore } from "@/store/cardsStore";

jest.mock("@/store/decksStore", () => ({
  useDecksStore: { getState: jest.fn(() => ({ create: jest.fn(async (input) => ({ ...input, id: "new-id" })), delete: jest.fn() })) },
}));
jest.mock("@/store/cardsStore", () => ({
  useCardsStore: { getState: jest.fn(() => ({ create: jest.fn() })) },
}));
jest.mock("expo-file-system", () => ({
  writeAsStringAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  getInfoAsync: jest.fn(async () => ({ exists: true })),
  documentDirectory: "file:///doc/",
  EncodingType: { Base64: "base64" },
}));

describe("applyImport", () => {
  it("creates a new deck and its cards for an entry resolved as keep-new", async () => {
    const entry = {
      deck: {
        id: "d-new", name: "French", emoji: "🇫🇷", description: null, cover_image: null,
        cards: [{ id: "c1", front_text: "bonjour", front_images: [], back_text: "hello", back_images: [] }],
      },
      collision: false,
      existingName: null,
    };
    await applyImport([entry], { "d-new": "keep" });
    const decksApi = useDecksStore.getState();
    expect(decksApi.create).toHaveBeenCalledWith(expect.objectContaining({ name: "French" }));
  });

  it("skips an entry resolved as skip", async () => {
    const entry = {
      deck: { id: "d1", name: "X", emoji: null, description: null, cover_image: null, cards: [] },
      collision: true,
      existingName: "X",
    };
    await applyImport([entry], { d1: "skip" });
    const decksApi = useDecksStore.getState();
    expect(decksApi.create).not.toHaveBeenCalled();
  });
});
```

### Green — append to import.ts

```typescript
import * as FileSystem from "expo-file-system";
import { useDecksStore } from "@/store/decksStore";
import { useCardsStore } from "@/store/cardsStore";
import { newUuid } from "./uuid";

const DOC_DIR = (FileSystem as unknown as { documentDirectory: string | null }).documentDirectory ?? "";
const IMAGE_DIR = `${DOC_DIR}images/`;

export type ResolveDecision = "keep" | "replace" | "skip";

async function ensureImageDir() {
  try {
    const info = await FileSystem.getInfoAsync(IMAGE_DIR);
    if (!info.exists) await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
  } catch {}
}

async function dataUriToFile(uri: string, prefix?: string): Promise<string> {
  const m = /^data:image\/[a-z]+;base64,(.*)$/i.exec(uri);
  if (!m) return uri; // already a path, leave alone
  await ensureImageDir();
  const tag = prefix ? `${prefix}_` : "";
  const dest = `${IMAGE_DIR}${tag}${newUuid()}.jpg`;
  await FileSystem.writeAsStringAsync(dest, m[1], { encoding: FileSystem.EncodingType.Base64 });
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
    // Decode cover image
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
```

Commit.

---

## Task 4: Share module + per-deck share menu

**Files:**
- Modify: `package.json` (install expo-document-picker)
- Create: `src/lib/share.ts`
- Modify: `src/app/index.tsx` (add Share option to menu)

Install: `npx expo install expo-document-picker`

Create `src/lib/share.ts`:

```typescript
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";

const DOC_DIR = (FileSystem as unknown as { documentDirectory: string | null }).documentDirectory ?? "";

function safeFilename(name: string): string {
  return name.replace(/[^a-z0-9_-]+/gi, "_").slice(0, 40) || "parchment";
}

export async function writeAndShare(json: string, suggestedName: string): Promise<void> {
  const path = `${DOC_DIR}${safeFilename(suggestedName)}.parchment.json`;
  await FileSystem.writeAsStringAsync(path, json);
  const available = await Sharing.isAvailableAsync();
  if (!available) return;
  await Sharing.shareAsync(path, { mimeType: "application/json" });
}

export async function pickImportFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "*/*"],
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (result.canceled || result.assets.length === 0) return null;
  const uri = result.assets[0].uri;
  const body = await FileSystem.readAsStringAsync(uri);
  return body;
}
```

In `src/app/index.tsx`, update the long-press deck menu to include Share:

Find:
```tsx
function showDeckMenu(deckName: string, onChoose: (choice: MenuChoice) => void) {
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ["Cancel", "Edit", "Delete"],
        destructiveButtonIndex: 2,
        cancelButtonIndex: 0,
        title: deckName,
      },
      (index) => {
        if (index === 1) onChoose("edit");
        else if (index === 2) onChoose("delete");
        else onChoose("cancel");
      }
    );
  } else {
    Alert.alert(deckName, "", [
      { text: "Cancel", style: "cancel", onPress: () => onChoose("cancel") },
      { text: "Edit", onPress: () => onChoose("edit") },
      { text: "Delete", style: "destructive", onPress: () => onChoose("delete") },
    ]);
  }
}
```

Replace with:

```tsx
type MenuChoice = "edit" | "share" | "delete" | "cancel";

function showDeckMenu(deckName: string, onChoose: (choice: MenuChoice) => void) {
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ["Cancel", "Edit", "Share", "Delete"],
        destructiveButtonIndex: 3,
        cancelButtonIndex: 0,
        title: deckName,
      },
      (index) => {
        if (index === 1) onChoose("edit");
        else if (index === 2) onChoose("share");
        else if (index === 3) onChoose("delete");
        else onChoose("cancel");
      }
    );
  } else {
    Alert.alert(deckName, "", [
      { text: "Cancel", style: "cancel", onPress: () => onChoose("cancel") },
      { text: "Edit", onPress: () => onChoose("edit") },
      { text: "Share", onPress: () => onChoose("share") },
      { text: "Delete", style: "destructive", onPress: () => onChoose("delete") },
    ]);
  }
}
```

(Update the `MenuChoice` type at the top of the file if it's defined separately.)

Then in the long-press wiring, add the "share" branch:

```tsx
                    if (choice === "edit") router.push({ pathname: "/deck/[id]/edit", params: { id: item.id } });
                    else if (choice === "share") {
                      (async () => {
                        try {
                          const json = await exportDeck(
                            item.id,
                            useDecksStore.getState().decks,
                            useCardsStore.getState().cardsByDeck
                          );
                          await writeAndShare(json, `parchment-deck-${item.name}`);
                        } catch (e: unknown) {
                          Alert.alert("Couldn't share deck", e instanceof Error ? e.message : String(e));
                        }
                      })();
                    }
                    else if (choice === "delete") {
                      // ... existing delete logic
```

Add the imports at the top:

```tsx
import { exportDeck } from "@/lib/export";
import { writeAndShare } from "@/lib/share";
import { useCardsStore } from "@/store/cardsStore";
```

(The cardsStore import may already exist from Plan 02b — don't duplicate.)

Commit.

---

## Task 5: Settings screen + Home gear icon

**Files:**
- Create: `src/app/settings.tsx`
- Modify: `src/app/index.tsx` (gear icon in header)

Create `src/app/settings.tsx`:

```tsx
import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import Constants from "expo-constants";
import { useTheme } from "@/theme/ThemeProvider";
import { useSettingsStore } from "@/store/settingsStore";
import { useDecksStore } from "@/store/decksStore";
import { useCardsStore } from "@/store/cardsStore";
import { FONT_SERIF } from "@/theme/fonts";
import { THEME_SELECTIONS, type ThemeSelection } from "@/theme/palette";
import { exportLibrary } from "@/lib/export";
import { parseAndPlanImport, applyImport, type ResolveDecision, type ImportPlanEntry } from "@/lib/import";
import { writeAndShare, pickImportFile } from "@/lib/share";

export default function SettingsScreen() {
  const { theme } = useTheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const [busy, setBusy] = useState(false);

  const onExport = async () => {
    setBusy(true);
    try {
      const json = await exportLibrary(
        useDecksStore.getState().decks,
        useCardsStore.getState().cardsByDeck
      );
      await writeAndShare(json, "parchment-library");
    } catch (e: unknown) {
      Alert.alert("Couldn't export", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const resolveCollisions = (entries: ImportPlanEntry[]): Promise<Record<string, ResolveDecision>> => {
    return new Promise((resolve) => {
      const decisions: Record<string, ResolveDecision> = {};
      const askNext = (i: number) => {
        if (i >= entries.length) return resolve(decisions);
        const e = entries[i];
        if (!e.collision) {
          decisions[e.deck.id] = "keep";
          askNext(i + 1);
          return;
        }
        Alert.alert(
          `Deck "${e.existingName}" already exists`,
          `What should we do with the imported "${e.deck.name}"?`,
          [
            { text: "Skip", onPress: () => { decisions[e.deck.id] = "skip"; askNext(i + 1); } },
            { text: "Keep both", onPress: () => { decisions[e.deck.id] = "keep"; askNext(i + 1); } },
            { text: "Replace", style: "destructive", onPress: () => { decisions[e.deck.id] = "replace"; askNext(i + 1); } },
          ]
        );
      };
      askNext(0);
    });
  };

  const onImport = async () => {
    setBusy(true);
    try {
      const body = await pickImportFile();
      if (!body) return;
      const plan = parseAndPlanImport(body, useDecksStore.getState().decks);
      const decisions = await resolveCollisions(plan.entries);
      await applyImport(plan.entries, decisions);
      await useDecksStore.getState().load();
      await useCardsStore.getState().loadCounts();
      Alert.alert("Import complete", `Imported ${plan.entries.filter((e) => decisions[e.deck.id] !== "skip").length} deck(s).`);
    } catch (e: unknown) {
      Alert.alert("Couldn't import", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bgApp }]} edges={["top", "left", "right"]}>
      <Stack.Screen options={{ title: "Settings" }} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Theme</Text>
        <View style={[styles.segment, { borderColor: theme.colors.accentSoft }]}>
          {THEME_SELECTIONS.map((mode: ThemeSelection) => (
            <Pressable
              key={mode}
              onPress={() => setThemeMode(mode)}
              style={[
                styles.segmentItem,
                themeMode === mode && { backgroundColor: theme.colors.accentPrimary },
              ]}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  { color: themeMode === mode ? theme.colors.bgCard : theme.colors.textBody },
                ]}
              >
                {mode === "system" ? "System" : mode === "light" ? "Light" : "Dark"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Library</Text>
        <Pressable
          onPress={onExport}
          disabled={busy}
          style={[styles.btn, { borderColor: theme.colors.accentSoft, opacity: busy ? 0.5 : 1 }]}
        >
          <Text style={[styles.btnLabel, { color: theme.colors.textBody }]}>Export library…</Text>
          <Text style={[styles.btnSub, { color: theme.colors.textMuted }]}>Save or share a .parchment file with all your decks.</Text>
        </Pressable>
        <Pressable
          onPress={onImport}
          disabled={busy}
          style={[styles.btn, { borderColor: theme.colors.accentSoft, opacity: busy ? 0.5 : 1 }]}
        >
          <Text style={[styles.btnLabel, { color: theme.colors.textBody }]}>Import library…</Text>
          <Text style={[styles.btnSub, { color: theme.colors.textMuted }]}>Read a .parchment file and add its decks.</Text>
        </Pressable>

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>About</Text>
        <Text style={[styles.aboutLine, { color: theme.colors.textBody }]}>
          Parchment v{Constants.expoConfig?.version ?? "0.1.0"}
        </Text>
        <Text style={[styles.aboutLine, { color: theme.colors.textMuted, fontStyle: "italic" }]}>
          Made for quiet studying.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { padding: 20, gap: 4 },
  label: {
    fontFamily: FONT_SERIF, fontSize: 12, fontStyle: "italic",
    marginTop: 16, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5,
  },
  segment: { flexDirection: "row", borderWidth: 1, borderRadius: 999, padding: 4, gap: 4 },
  segmentItem: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 999 },
  segmentLabel: { fontFamily: FONT_SERIF, fontSize: 14, fontWeight: "600" },
  btn: {
    borderWidth: 1, borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 16,
    marginTop: 6,
  },
  btnLabel: { fontFamily: FONT_SERIF, fontSize: 15, fontWeight: "600" },
  btnSub: { fontFamily: FONT_SERIF, fontSize: 12, fontStyle: "italic", marginTop: 4 },
  aboutLine: { fontFamily: FONT_SERIF, fontSize: 14, marginTop: 2 },
});
```

In `src/app/index.tsx`, add a gear icon next to the "+" button in the header:

Find the header's right side `<Pressable>` for the "+" button. ADD a sibling gear icon BEFORE it:

```tsx
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            style={[styles.iconBtn]}
            onPress={() => router.push("/settings")}
          >
            <Text style={[styles.gearGlyph, { color: theme.colors.textMuted }]}>⚙</Text>
          </Pressable>
          {/* existing "+" Pressable */}
        </View>
```

Wrap the existing `+` Pressable in the outer View so they sit side by side. Add the `iconBtn` and `gearGlyph` styles to the StyleSheet:

```tsx
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  gearGlyph: { fontSize: 22 },
```

Commit.

---

## Self-Review

Spec coverage: §2.6 backup/restore (Tasks 1-2-3), §2.7 sharing (Task 4), §5.6 Settings (Task 5). The collision flow uses a chained Alert sequence rather than a custom dialog — pragmatic for v1.
