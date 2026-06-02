# Parchment — Plan 02b: Card CRUD + Markdown Editor + Deck Detail

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Users can navigate into a deck, see its cards, create / edit / delete cards using a live-preview Markdown editor with optional images on each side. The Home grid shows real per-deck card counts.

**Architecture:** Add a `cardsStore` mirroring `decksStore`'s shape (load-by-deck, create, update, delete) with the same SQLite write patterns and error handling. A `MarkdownText` presentational component renders our supported Markdown subset via `react-native-marked`. The `CardEditor` screen uses a tabbed Front/Back layout, each with a `TextInput` for raw Markdown and a synced live `MarkdownText` preview below.

**Tech Stack additions:** `react-native-marked`. No other new dependencies.

---

## Task 1: cardsStore — load + create + update + delete (TDD, one combined commit pair)

**Files:**
- Create: `src/store/cardsStore.ts`
- Create: `src/store/__tests__/cardsStore.test.ts`

### Phase 1 — Red

Create `src/store/__tests__/cardsStore.test.ts` with:

```typescript
import { useCardsStore } from "../cardsStore";
import { getDatabase } from "@/db/client";

interface CardRow {
  id: string; deck_id: string;
  front_text: string; front_images: string;
  back_text: string; back_images: string;
  sort_order: number; created_at: number; updated_at: number;
}

const fakeDb = {
  rows: [] as CardRow[],
  ran: [] as { sql: string; params: unknown[] }[],
  async withTransactionAsync(cb: () => Promise<void>) { await cb(); },
  async getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]> {
    if (sql.includes("WHERE deck_id = ?")) {
      const [deckId] = params as [string];
      return this.rows
        .filter((r) => r.deck_id === deckId)
        .sort((a, b) => a.sort_order - b.sort_order) as unknown as T[];
    }
    if (sql.includes("GROUP BY deck_id")) {
      const counts = new Map<string, number>();
      for (const r of this.rows) counts.set(r.deck_id, (counts.get(r.deck_id) ?? 0) + 1);
      return Array.from(counts.entries()).map(([deck_id, count]) => ({ deck_id, count })) as unknown as T[];
    }
    return [];
  },
  async runAsync(sql: string, ...params: unknown[]) {
    this.ran.push({ sql, params });
    if (/^INSERT INTO cards/i.test(sql)) {
      const [id, deck_id, front_text, front_images, back_text, back_images, sort_order, created_at, updated_at] =
        params as [string, string, string, string, string, string, number, number, number];
      this.rows.push({ id, deck_id, front_text, front_images, back_text, back_images, sort_order, created_at, updated_at });
    } else if (/^UPDATE cards SET/i.test(sql)) {
      const ps = params as unknown[];
      const id = ps[ps.length - 1] as string;
      const row = this.rows.find((r) => r.id === id);
      if (!row) return;
      row.front_text = ps[0] as string;
      row.front_images = ps[1] as string;
      row.back_text = ps[2] as string;
      row.back_images = ps[3] as string;
      row.updated_at = ps[4] as number;
    } else if (/^DELETE FROM cards/i.test(sql)) {
      const [id] = params as [string];
      this.rows = this.rows.filter((r) => r.id !== id);
    }
  },
};

jest.mock("@/db/client", () => ({ getDatabase: jest.fn() }));
jest.mock("@/lib/uuid", () => ({ newUuid: jest.fn() }));
const mockedGetDatabase = jest.mocked(getDatabase);
const mockedNewUuid = jest.mocked(require("@/lib/uuid").newUuid);

describe("cardsStore", () => {
  beforeEach(() => {
    fakeDb.rows = [];
    fakeDb.ran = [];
    useCardsStore.setState({ cardsByDeck: {}, counts: {} });
    mockedGetDatabase.mockReset();
    mockedGetDatabase.mockResolvedValue(fakeDb as never);
    mockedNewUuid.mockReset();
    let n = 0;
    mockedNewUuid.mockImplementation(() => `uuid-${++n}`);
  });

  it("loadByDeck returns empty when no cards exist for the deck", async () => {
    await useCardsStore.getState().loadByDeck("d1");
    expect(useCardsStore.getState().cardsByDeck["d1"]).toEqual([]);
  });

  it("loadByDeck maps snake_case rows including JSON-array image columns", async () => {
    fakeDb.rows = [
      { id: "c1", deck_id: "d1", front_text: "**hi**", front_images: '["img/a.jpg"]',
        back_text: "back", back_images: "[]", sort_order: 0, created_at: 1, updated_at: 1 },
    ];
    await useCardsStore.getState().loadByDeck("d1");
    const cards = useCardsStore.getState().cardsByDeck["d1"];
    expect(cards).toHaveLength(1);
    expect(cards[0]).toEqual({
      id: "c1", deckId: "d1",
      frontText: "**hi**", frontImages: ["img/a.jpg"],
      backText: "back", backImages: [],
      sortOrder: 0, createdAt: 1, updatedAt: 1,
    });
  });

  it("create() inserts a card with sort_order = number of cards in deck", async () => {
    await useCardsStore.getState().create("d1", {
      frontText: "Q1", frontImages: [], backText: "A1", backImages: [],
    });
    await useCardsStore.getState().create("d1", {
      frontText: "Q2", frontImages: [], backText: "A2", backImages: [],
    });
    const cards = useCardsStore.getState().cardsByDeck["d1"];
    expect(cards.map((c) => c.sortOrder)).toEqual([0, 1]);
    expect(cards.map((c) => c.frontText)).toEqual(["Q1", "Q2"]);
  });

  it("update() patches front/back text and images via SQL UPDATE", async () => {
    await useCardsStore.getState().create("d1", { frontText: "Q1", frontImages: [], backText: "A1", backImages: [] });
    const id = useCardsStore.getState().cardsByDeck["d1"][0].id;
    await useCardsStore.getState().update(id, {
      frontText: "Q1!", frontImages: ["img/x.jpg"], backText: "A1!", backImages: [],
    });
    const c = useCardsStore.getState().cardsByDeck["d1"][0];
    expect(c.frontText).toBe("Q1!");
    expect(c.frontImages).toEqual(["img/x.jpg"]);
    expect(c.backText).toBe("A1!");
  });

  it("delete() removes the card from store and SQLite", async () => {
    await useCardsStore.getState().create("d1", { frontText: "Q1", frontImages: [], backText: "A1", backImages: [] });
    const id = useCardsStore.getState().cardsByDeck["d1"][0].id;
    await useCardsStore.getState().delete(id, "d1");
    expect(useCardsStore.getState().cardsByDeck["d1"]).toEqual([]);
    expect(fakeDb.ran.some((r) => /^DELETE FROM cards/i.test(r.sql))).toBe(true);
  });

  it("loadCounts populates counts by deck_id from a GROUP BY query", async () => {
    await useCardsStore.getState().create("d1", { frontText: "Q1", frontImages: [], backText: "A1", backImages: [] });
    await useCardsStore.getState().create("d1", { frontText: "Q2", frontImages: [], backText: "A2", backImages: [] });
    await useCardsStore.getState().create("d2", { frontText: "Q3", frontImages: [], backText: "A3", backImages: [] });
    await useCardsStore.getState().loadCounts();
    expect(useCardsStore.getState().counts).toEqual({ d1: 2, d2: 1 });
  });
});
```

Run: `npm test -- cardsStore.test.ts`. Expect failure ("Cannot find module").

Stage only the test file. Commit:

```
Plan 02b Task 1 (red): failing tests for cardsStore

6 tests cover loadByDeck (empty + with rows + snake-case mapping
including JSON-parsed image arrays), create (sequential sort_order),
update (text + image JSON round-trip), delete, and loadCounts (a
GROUP BY query for the home grid).
```

### Phase 2 — Green

Create `src/store/cardsStore.ts`:

```typescript
import { create as createStore } from "zustand";
import { getDatabase } from "@/db/client";
import { newUuid } from "@/lib/uuid";

export interface Card {
  id: string;
  deckId: string;
  frontText: string;
  frontImages: string[];
  backText: string;
  backImages: string[];
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

interface CardRow {
  id: string; deck_id: string;
  front_text: string; front_images: string;
  back_text: string; back_images: string;
  sort_order: number; created_at: number; updated_at: number;
}

export interface CardInput {
  frontText: string;
  frontImages: string[];
  backText: string;
  backImages: string[];
}

interface CardsState {
  cardsByDeck: Record<string, Card[]>;
  counts: Record<string, number>;
  loadByDeck: (deckId: string) => Promise<void>;
  loadCounts: () => Promise<void>;
  create: (deckId: string, input: CardInput) => Promise<Card>;
  update: (id: string, input: CardInput) => Promise<void>;
  delete: (id: string, deckId: string) => Promise<void>;
}

interface RunnableDb {
  getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  runAsync(sql: string, ...params: unknown[]): Promise<unknown>;
  withTransactionAsync(cb: () => Promise<void>): Promise<void>;
}
function asRunnable(db: unknown): RunnableDb { return db as RunnableDb; }

function rowToCard(r: CardRow): Card {
  let frontImages: string[] = [];
  let backImages: string[] = [];
  try { frontImages = JSON.parse(r.front_images); } catch {}
  try { backImages = JSON.parse(r.back_images); } catch {}
  return {
    id: r.id, deckId: r.deck_id,
    frontText: r.front_text, frontImages,
    backText: r.back_text, backImages,
    sortOrder: r.sort_order,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

export const useCardsStore = createStore<CardsState>((set, get) => ({
  cardsByDeck: {},
  counts: {},
  async loadByDeck(deckId) {
    const db = asRunnable(await getDatabase());
    const rows = await db.getAllAsync<CardRow>(
      "SELECT * FROM cards WHERE deck_id = ? ORDER BY sort_order ASC, created_at ASC;",
      deckId
    );
    set({ cardsByDeck: { ...get().cardsByDeck, [deckId]: rows.map(rowToCard) } });
  },
  async loadCounts() {
    const db = asRunnable(await getDatabase());
    const rows = await db.getAllAsync<{ deck_id: string; count: number }>(
      "SELECT deck_id, COUNT(*) as count FROM cards GROUP BY deck_id;"
    );
    const counts: Record<string, number> = {};
    for (const row of rows) counts[row.deck_id] = row.count;
    set({ counts });
  },
  async create(deckId, input) {
    const db = asRunnable(await getDatabase());
    const id = newUuid();
    const now = Date.now();
    const current = get().cardsByDeck[deckId] ?? [];
    const sortOrder = current.length;
    const frontImagesJson = JSON.stringify(input.frontImages);
    const backImagesJson = JSON.stringify(input.backImages);
    await db.runAsync(
      `INSERT INTO cards (id, deck_id, front_text, front_images, back_text, back_images, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      id, deckId, input.frontText, frontImagesJson, input.backText, backImagesJson, sortOrder, now, now
    );
    const card: Card = {
      id, deckId,
      frontText: input.frontText, frontImages: input.frontImages,
      backText: input.backText, backImages: input.backImages,
      sortOrder, createdAt: now, updatedAt: now,
    };
    set({
      cardsByDeck: { ...get().cardsByDeck, [deckId]: [...current, card] },
      counts: { ...get().counts, [deckId]: (get().counts[deckId] ?? 0) + 1 },
    });
    return card;
  },
  async update(id, input) {
    const db = asRunnable(await getDatabase());
    const now = Date.now();
    const frontImagesJson = JSON.stringify(input.frontImages);
    const backImagesJson = JSON.stringify(input.backImages);
    await db.runAsync(
      "UPDATE cards SET front_text = ?, front_images = ?, back_text = ?, back_images = ?, updated_at = ? WHERE id = ?;",
      input.frontText, frontImagesJson, input.backText, backImagesJson, now, id
    );
    const cbd = { ...get().cardsByDeck };
    for (const deckId of Object.keys(cbd)) {
      const idx = cbd[deckId].findIndex((c) => c.id === id);
      if (idx >= 0) {
        const updated: Card = {
          ...cbd[deckId][idx],
          frontText: input.frontText, frontImages: input.frontImages,
          backText: input.backText, backImages: input.backImages,
          updatedAt: now,
        };
        cbd[deckId] = [...cbd[deckId].slice(0, idx), updated, ...cbd[deckId].slice(idx + 1)];
      }
    }
    set({ cardsByDeck: cbd });
  },
  async delete(id, deckId) {
    const db = asRunnable(await getDatabase());
    await db.runAsync("DELETE FROM cards WHERE id = ?;", id);
    const current = get().cardsByDeck[deckId] ?? [];
    set({
      cardsByDeck: { ...get().cardsByDeck, [deckId]: current.filter((c) => c.id !== id) },
      counts: { ...get().counts, [deckId]: Math.max(0, (get().counts[deckId] ?? 0) - 1) },
    });
  },
}));
```

Run: `npm test -- cardsStore.test.ts`. Expect 6/6 pass.

Stage only impl. Commit:

```
Plan 02b Task 1 (green): cardsStore with load/create/update/delete + counts

cardsByDeck holds the per-deck card list keyed by deckId so each Deck
Detail screen reads its own slice without cross-talk. counts is a flat
deckId→number map populated by loadCounts() (GROUP BY in SQL) and used
by the Home grid to show "N cards" instead of "0".

The image array columns are persisted as JSON.stringify text and parsed
on the way out (rowToCard) — schema lets us grow past one image per
side later without a migration.
```

---

## Task 2: Wire Home grid to use real card counts

**Files:**
- Modify: `src/app/_layout.tsx` (call loadCounts in hydrate)
- Modify: `src/app/index.tsx` (read counts from cardsStore)

In `src/app/_layout.tsx`, in the `hydrate` function body, add this line AFTER `await useDecksStore.getState().load();`:

```tsx
      await useCardsStore.getState().loadCounts();
```

Add the import at the top with the other stores:

```tsx
import { useCardsStore } from "@/store/cardsStore";
```

In `src/app/index.tsx`, near the top of the `Home` component (alongside the existing `useDecksStore` selector), add:

```tsx
  const counts = useCardsStore((s) => s.counts);
```

Add the import:

```tsx
import { useCardsStore } from "@/store/cardsStore";
```

In the `renderItem`, replace `cardCount={0}` with `cardCount={counts[item.id] ?? 0}`.

Run `npx tsc --noEmit` — clean. Run `npm test` — 58/58 pass (52 prior + 6 new from Task 1).

Stage and commit:

```
Plan 02b Task 2: Home grid shows real card counts via cardsStore.counts

Boot hydration calls loadCounts() to populate the count selector before
the first render, then the FlatList renderItem reads counts[deck.id]
instead of the hard-coded 0 placeholder.
```

---

## Task 3: Install react-native-marked and build MarkdownText component

**Files:**
- Modify: `package.json` (via npm install)
- Create: `src/components/MarkdownText.tsx`
- Create: `src/components/__tests__/MarkdownText.test.tsx`

### Phase 1 — Install

```bash
npm install react-native-marked
```

(Plain npm — not an Expo native module.)

### Phase 2 — Red

Create `src/components/__tests__/MarkdownText.test.tsx`:

```tsx
import React from "react";
import { render, screen } from "@testing-library/react-native";
import { MarkdownText } from "../MarkdownText";
import { ThemeProvider } from "@/theme/ThemeProvider";

describe("MarkdownText", () => {
  it("renders plain text content", () => {
    render(
      <ThemeProvider mode="light">
        <MarkdownText>hello world</MarkdownText>
      </ThemeProvider>
    );
    expect(screen.getByText(/hello world/i)).toBeOnTheScreen();
  });
});
```

Run, see fail. Commit (red).

### Phase 3 — Green

Create `src/components/MarkdownText.tsx`:

```tsx
import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF } from "@/theme/fonts";
import Markdown from "react-native-marked";

interface Props {
  children: string;
}

export function MarkdownText({ children }: Props) {
  const { theme } = useTheme();
  // Fallback if children is empty — render an italic placeholder
  if (!children || children.trim().length === 0) {
    return (
      <Text style={[styles.empty, { color: theme.colors.textMuted }]}>
        (empty)
      </Text>
    );
  }
  try {
    return (
      <View>
        <Markdown
          value={children}
          flatListProps={{
            initialNumToRender: 8,
            style: { backgroundColor: "transparent" },
          }}
          theme={{
            colors: {
              background: "transparent",
              code: theme.colors.bgApp,
              link: theme.colors.accentPrimary,
              text: theme.colors.textBody,
              border: theme.colors.accentSoft,
            },
          }}
        />
      </View>
    );
  } catch {
    // If the markdown library throws on malformed input, fall back to plain text
    return <Text style={[styles.fallback, { color: theme.colors.textBody }]}>{children}</Text>;
  }
}

const styles = StyleSheet.create({
  empty: {
    fontFamily: FONT_SERIF,
    fontStyle: "italic",
    fontSize: 14,
  },
  fallback: {
    fontFamily: FONT_SERIF,
    fontSize: 16,
  },
});
```

Run tests — expect pass.

Stage and commit:

```
Plan 02b Task 3 (green): MarkdownText renderer via react-native-marked

Thin wrapper around react-native-marked that themes the output to our
palette (text/body, accent links, parchment code blocks) and falls back
to plain Text on render exceptions. Empty input shows an italic
"(empty)" placeholder so the editor preview never collapses to nothing.
```

---

## Task 4: CardRow component

**Files:**
- Create: `src/components/CardRow.tsx`
- Create: `src/components/__tests__/CardRow.test.tsx`

### Red

```tsx
import React from "react";
import { render, screen } from "@testing-library/react-native";
import { CardRow } from "../CardRow";
import { ThemeProvider } from "@/theme/ThemeProvider";
import type { Card } from "@/store/cardsStore";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "c1", deckId: "d1",
    frontText: "What is the capital of France?",
    frontImages: [], backText: "Paris", backImages: [],
    sortOrder: 0, createdAt: 0, updatedAt: 0,
    ...overrides,
  };
}

describe("CardRow", () => {
  it("renders the first 80 chars of front text", () => {
    render(
      <ThemeProvider mode="light">
        <CardRow card={makeCard()} onPress={() => {}} onLongPress={() => {}} />
      </ThemeProvider>
    );
    expect(screen.getByText(/capital of France/)).toBeOnTheScreen();
  });

  it("shows an image-attachment indicator when front_images is non-empty", () => {
    render(
      <ThemeProvider mode="light">
        <CardRow card={makeCard({ frontImages: ["file:///doc/images/x.jpg"] })} onPress={() => {}} onLongPress={() => {}} />
      </ThemeProvider>
    );
    expect(screen.getByText("🖼")).toBeOnTheScreen();
  });
});
```

### Green

```tsx
import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF } from "@/theme/fonts";
import type { Card } from "@/store/cardsStore";

interface Props {
  card: Card;
  onPress: () => void;
  onLongPress: () => void;
}

function previewText(s: string): string {
  const trimmed = s.trim();
  if (trimmed.length === 0) return "(empty)";
  return trimmed.length > 80 ? trimmed.slice(0, 80) + "…" : trimmed;
}

export function CardRow({ card, onPress, onLongPress }: Props) {
  const { theme } = useTheme();
  const hasImage = card.frontImages.length > 0 || card.backImages.length > 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit card`}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.row, { backgroundColor: theme.colors.bgCard, borderColor: theme.colors.accentSoft }]}
    >
      <View style={styles.body}>
        <Text style={[styles.front, { color: theme.colors.textPrimary }]} numberOfLines={2}>
          {previewText(card.frontText)}
        </Text>
      </View>
      {hasImage && (
        <Text style={[styles.icon, { color: theme.colors.textMuted }]}>🖼</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  body: { flex: 1 },
  front: {
    fontFamily: FONT_SERIF,
    fontSize: 14,
  },
  icon: { fontSize: 16 },
});
```

Run tests, two-commit TDD, commit messages following the pattern.

---

## Task 5: Deck Detail screen

**Files:**
- Create: `src/app/deck/[id]/index.tsx`
- Modify: `src/app/index.tsx` (remove the `as never` cast on `/deck/[id]` since the route exists)

Create `src/app/deck/[id]/index.tsx`:

```tsx
import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet, FlatList, Alert, Platform, ActionSheetIOS } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { useDecksStore } from "@/store/decksStore";
import { useCardsStore } from "@/store/cardsStore";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF } from "@/theme/fonts";
import { CardRow } from "@/components/CardRow";

type MenuChoice = "edit" | "delete" | "cancel";

function showCardMenu(onChoose: (c: MenuChoice) => void) {
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      { options: ["Cancel", "Edit", "Delete"], destructiveButtonIndex: 2, cancelButtonIndex: 0 },
      (i) => {
        if (i === 1) onChoose("edit");
        else if (i === 2) onChoose("delete");
        else onChoose("cancel");
      }
    );
  } else {
    Alert.alert("Card", "", [
      { text: "Cancel", style: "cancel", onPress: () => onChoose("cancel") },
      { text: "Edit", onPress: () => onChoose("edit") },
      { text: "Delete", style: "destructive", onPress: () => onChoose("delete") },
    ]);
  }
}

export default function DeckDetailScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const deck = useDecksStore((s) => s.decks.find((d) => d.id === id));
  const cards = useCardsStore((s) => s.cardsByDeck[id ?? ""] ?? []);
  const loadByDeck = useCardsStore((s) => s.loadByDeck);

  useEffect(() => {
    if (id) loadByDeck(id);
  }, [id, loadByDeck]);

  if (!deck) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bgApp, alignItems: "center", justifyContent: "center" }]} edges={["bottom", "left", "right"]}>
        <Stack.Screen options={{ title: "Deck" }} />
        <Text style={{ fontFamily: FONT_SERIF, fontSize: 16, fontStyle: "italic", color: theme.colors.textMuted }}>
          Deck not found
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bgApp }]} edges={["bottom", "left", "right"]}>
      <Stack.Screen options={{ title: deck.name }} />
      <View style={styles.header}>
        <Text style={[styles.emoji, { color: theme.colors.textPrimary }]}>{deck.emoji ?? "📁"}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: theme.colors.textPrimary }]} numberOfLines={2}>{deck.name}</Text>
          {deck.description && (
            <Text style={[styles.desc, { color: theme.colors.textMuted }]} numberOfLines={3}>
              {deck.description}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: "/deck/[id]/study", params: { id: deck.id } } as never)}
          disabled={cards.length === 0}
          style={[
            styles.btnPrimary,
            { backgroundColor: theme.colors.accentPrimary, opacity: cards.length === 0 ? 0.4 : 1 },
          ]}
        >
          <Text style={[styles.btnPrimaryLabel, { color: theme.colors.bgCard }]}>Study</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: "/deck/[id]/card/new", params: { id: deck.id } })}
          style={[styles.btnGhost, { borderColor: theme.colors.accentSoft }]}
        >
          <Text style={[styles.btnGhostLabel, { color: theme.colors.textBody }]}>+ Add card</Text>
        </Pressable>
      </View>

      {cards.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyGlyph, { color: theme.colors.textMuted }]}>🎴</Text>
          <Text style={[styles.emptyCopy, { color: theme.colors.textMuted }]}>No cards yet. Tap “+ Add card” to create one.</Text>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <CardRow
              card={item}
              onPress={() =>
                router.push({ pathname: "/deck/[id]/card/[cardId]/edit", params: { id: deck.id, cardId: item.id } })
              }
              onLongPress={() =>
                showCardMenu((c) => {
                  if (c === "edit")
                    router.push({ pathname: "/deck/[id]/card/[cardId]/edit", params: { id: deck.id, cardId: item.id } });
                  else if (c === "delete")
                    Alert.alert("Delete card?", "This will permanently remove the card.", [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => {
                          useCardsStore.getState().delete(item.id, deck.id).catch((e) =>
                            Alert.alert("Couldn't delete card", e.message)
                          );
                        },
                      },
                    ]);
                })
              }
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 12 },
  emoji: { fontSize: 36 },
  name: { fontFamily: FONT_SERIF, fontSize: 22, fontWeight: "700", letterSpacing: -0.3 },
  desc: { fontFamily: FONT_SERIF, fontSize: 13, fontStyle: "italic", marginTop: 4 },
  actions: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingBottom: 16 },
  btnPrimary: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 999 },
  btnPrimaryLabel: { fontFamily: FONT_SERIF, fontSize: 14, fontWeight: "600" },
  btnGhost: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  btnGhostLabel: { fontFamily: FONT_SERIF, fontSize: 14, fontWeight: "600" },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  emptyGlyph: { fontSize: 48 },
  emptyCopy: { fontFamily: FONT_SERIF, fontSize: 14, fontStyle: "italic", textAlign: "center", maxWidth: 280 },
});
```

Also in `src/app/index.tsx`, remove the `as never` cast on the deck-tile onPress:

```tsx
                onPress={() => router.push({ pathname: "/deck/[id]", params: { id: item.id } })}
```

(Use the object form like Task 11 of Plan 02a — the route exists now.)

Commit:

```
Plan 02b Task 5: Deck Detail screen with card list, Study button, and add/edit/delete

Reads the [id] param, finds the deck and its cards via the two stores,
and renders a header (emoji + name + optional description), a primary
"Study" button (disabled when the deck has zero cards), a ghost "+ Add
card" button, and either an empty state or a FlatList of CardRows.

Long-press on a card row opens the same Edit / Delete sheet pattern
we use on deck tiles. The Study route is owned by Plan 03; cast to
never until then.

Also removes the `as never` cast on the Home tile's onPress now that
/deck/[id] resolves to this screen.
```

---

## Task 6: Card Editor screen with live Markdown preview

**Files:**
- Create: `src/components/CardEditor.tsx`
- Create: `src/app/deck/[id]/card/new.tsx`
- Create: `src/app/deck/[id]/card/[cardId]/edit.tsx`

Create `src/components/CardEditor.tsx`:

```tsx
import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, Image,
} from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF } from "@/theme/fonts";
import { pickAndStoreImage } from "@/lib/image";
import { MarkdownText } from "./MarkdownText";

export interface CardEditorValues {
  frontText: string;
  frontImages: string[];
  backText: string;
  backImages: string[];
}

interface Props {
  initial: CardEditorValues;
  onSubmit: (values: CardEditorValues) => void;
  onCancel: () => void;
}

type Side = "front" | "back";

export function CardEditor({ initial, onSubmit, onCancel }: Props) {
  const { theme } = useTheme();
  const [active, setActive] = useState<Side>("front");
  const [frontText, setFrontText] = useState(initial.frontText);
  const [frontImages, setFrontImages] = useState<string[]>(initial.frontImages);
  const [backText, setBackText] = useState(initial.backText);
  const [backImages, setBackImages] = useState<string[]>(initial.backImages);
  const [picking, setPicking] = useState(false);

  const text = active === "front" ? frontText : backText;
  const setText = active === "front" ? setFrontText : setBackText;
  const images = active === "front" ? frontImages : backImages;
  const setImages = active === "front" ? setFrontImages : setBackImages;

  const chooseImage = async () => {
    setPicking(true);
    try {
      const picked = await pickAndStoreImage("card");
      if (picked) setImages([picked.path]);
    } finally {
      setPicking(false);
    }
  };

  const insertSyntax = (open: string, close: string = open) => {
    setText(text + open + "text" + close);
  };

  const submit = () => {
    onSubmit({ frontText, frontImages, backText, backImages });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.tabs, { borderColor: theme.colors.accentSoft }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setActive("front")}
          style={[styles.tab, active === "front" && { borderBottomColor: theme.colors.accentPrimary, borderBottomWidth: 2 }]}
        >
          <Text style={[styles.tabLabel, { color: active === "front" ? theme.colors.textPrimary : theme.colors.textMuted }]}>Front</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setActive("back")}
          style={[styles.tab, active === "back" && { borderBottomColor: theme.colors.accentPrimary, borderBottomWidth: 2 }]}
        >
          <Text style={[styles.tabLabel, { color: active === "back" ? theme.colors.textPrimary : theme.colors.textMuted }]}>Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={[styles.toolbar, { borderColor: theme.colors.accentSoft }]}>
          <Pressable onPress={() => insertSyntax("**")} style={styles.toolBtn}><Text style={{ fontWeight: "700", color: theme.colors.textBody }}>B</Text></Pressable>
          <Pressable onPress={() => insertSyntax("*")} style={styles.toolBtn}><Text style={{ fontStyle: "italic", color: theme.colors.textBody }}>I</Text></Pressable>
          <Pressable onPress={() => insertSyntax("- ", "")} style={styles.toolBtn}><Text style={{ color: theme.colors.textBody }}>•</Text></Pressable>
          <Pressable onPress={() => insertSyntax("`")} style={styles.toolBtn}><Text style={{ fontFamily: "Courier", color: theme.colors.textBody }}>{"</>"}</Text></Pressable>
        </View>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={`${active === "front" ? "Front" : "Back"} markdown…`}
          placeholderTextColor={theme.colors.textMuted}
          multiline
          style={[styles.input, { color: theme.colors.textPrimary, backgroundColor: theme.colors.bgCard, borderColor: theme.colors.accentSoft }]}
        />

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Preview</Text>
        <View style={[styles.preview, { backgroundColor: theme.colors.bgCard, borderColor: theme.colors.accentSoft }]}>
          <MarkdownText>{text}</MarkdownText>
        </View>

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Image</Text>
        {images[0] ? (
          <View style={{ gap: 10 }}>
            <Image source={{ uri: images[0] }} style={styles.imagePreview} resizeMode="cover" />
            <Pressable onPress={() => setImages([])} style={[styles.btnGhost, { borderColor: theme.colors.accentSoft }]}>
              <Text style={[styles.btnGhostLabel, { color: theme.colors.textBody }]}>Remove image</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={chooseImage}
            disabled={picking}
            style={[styles.btnGhost, { borderColor: theme.colors.accentSoft, opacity: picking ? 0.5 : 1 }]}
          >
            <Text style={[styles.btnGhostLabel, { color: theme.colors.textBody }]}>
              {picking ? "Picking…" : "Choose image"}
            </Text>
          </Pressable>
        )}

        <View style={styles.actions}>
          <Pressable onPress={onCancel} style={[styles.btnGhost, { borderColor: theme.colors.accentSoft }]}>
            <Text style={[styles.btnGhostLabel, { color: theme.colors.textBody }]}>Cancel</Text>
          </Pressable>
          <Pressable onPress={submit} style={[styles.btnPrimary, { backgroundColor: theme.colors.accentPrimary }]}>
            <Text style={[styles.btnPrimaryLabel, { color: theme.colors.bgCard }]}>Save</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: 16 },
  tab: { paddingVertical: 12, paddingHorizontal: 18 },
  tabLabel: { fontFamily: FONT_SERIF, fontSize: 14, fontWeight: "600" },
  body: { padding: 16, gap: 4 },
  toolbar: { flexDirection: "row", borderWidth: 1, borderRadius: 8, padding: 4, gap: 4, alignSelf: "flex-start", marginBottom: 6 },
  toolBtn: { paddingVertical: 4, paddingHorizontal: 10, minWidth: 32, alignItems: "center" },
  input: {
    fontFamily: FONT_SERIF, fontSize: 16,
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    minHeight: 120, textAlignVertical: "top",
  },
  label: {
    fontFamily: FONT_SERIF, fontSize: 12, fontStyle: "italic",
    marginTop: 14, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5,
  },
  preview: { borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 80 },
  imagePreview: { width: "100%", aspectRatio: 16 / 9, borderRadius: 10 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 20 },
  btnGhost: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, borderWidth: 1, alignSelf: "flex-start" },
  btnGhostLabel: { fontFamily: FONT_SERIF, fontSize: 14, fontWeight: "600" },
  btnPrimary: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 999 },
  btnPrimaryLabel: { fontFamily: FONT_SERIF, fontSize: 14, fontWeight: "600" },
});
```

Create `src/app/deck/[id]/card/new.tsx`:

```tsx
import React from "react";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCardsStore } from "@/store/cardsStore";
import { useTheme } from "@/theme/ThemeProvider";
import { CardEditor, type CardEditorValues } from "@/components/CardEditor";

export default function NewCardScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const create = useCardsStore((s) => s.create);

  const handleSubmit = async (values: CardEditorValues) => {
    if (!id) return;
    await create(id, values);
    router.back();
  };

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={{ flex: 1, backgroundColor: theme.colors.bgApp }}>
      <Stack.Screen options={{ title: "New card" }} />
      <CardEditor
        initial={{ frontText: "", frontImages: [], backText: "", backImages: [] }}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />
    </SafeAreaView>
  );
}
```

Create `src/app/deck/[id]/card/[cardId]/edit.tsx`:

```tsx
import React from "react";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View } from "react-native";
import { useCardsStore } from "@/store/cardsStore";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF } from "@/theme/fonts";
import { CardEditor, type CardEditorValues } from "@/components/CardEditor";

export default function EditCardScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id, cardId } = useLocalSearchParams<{ id: string; cardId: string }>();
  const card = useCardsStore((s) => s.cardsByDeck[id ?? ""]?.find((c) => c.id === cardId));
  const update = useCardsStore((s) => s.update);

  const handleSubmit = async (values: CardEditorValues) => {
    if (!card) return;
    await update(card.id, values);
    router.back();
  };

  if (!card) {
    return (
      <SafeAreaView
        edges={["bottom", "left", "right"]}
        style={{ flex: 1, backgroundColor: theme.colors.bgApp, alignItems: "center", justifyContent: "center", padding: 24 }}
      >
        <Stack.Screen options={{ title: "Edit card" }} />
        <View>
          <Text style={{ fontFamily: FONT_SERIF, fontSize: 16, fontStyle: "italic", color: theme.colors.textMuted }}>
            Card not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={{ flex: 1, backgroundColor: theme.colors.bgApp }}>
      <Stack.Screen options={{ title: "Edit card" }} />
      <CardEditor
        initial={{
          frontText: card.frontText, frontImages: card.frontImages,
          backText: card.backText, backImages: card.backImages,
        }}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />
    </SafeAreaView>
  );
}
```

Commit:

```
Plan 02b Task 6: CardEditor with tabbed Front/Back + live Markdown preview

Front/Back tabs share the same scrollable body; switching tabs preserves
the other side's state. Each side has a Markdown TextInput with a small
syntax-insertion toolbar (B / I / • / </>), a live MarkdownText preview
below, and a single optional image slot. Tap Save to commit; Cancel to
discard.

Both routes (/deck/[id]/card/new and /deck/[id]/card/[cardId]/edit) wrap
CardEditor in a SafeAreaView with a Stack.Screen title.
```

---

## Self-Review Notes

- Spec coverage: §5.2 Deck Detail (Task 5), §5.4 Card Editor (Tasks 3, 6), §7 schema/JSON arrays (Task 1).
- No placeholders, no TBDs, no broken type references.
- Drag-to-reorder for cards is deferred (matches the Plan 02a deferral for decks).
