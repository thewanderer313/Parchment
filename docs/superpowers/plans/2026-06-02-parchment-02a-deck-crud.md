# Parchment — Plan 02a: Deck CRUD

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Users can create, edit, delete, reorder, and visually pick a cover image for decks. The Home screen renders a 2-column grid of `DeckTile`s sourced from SQLite via the decks store. A long-press menu and drag handle support edit/delete and reorder.

**Architecture:** Expand the existing `decksStore` with `create`, `update`, `delete`, and `reorder` actions that write to SQLite and re-derive the in-memory list. Add a `DeckEditor` form component that's reused by both `app/deck/new.tsx` and `app/deck/[id]/edit.tsx`. Picture picking, resizing, and on-disk storage are isolated in `src/lib/image.ts` so the editor itself stays presentational.

**Tech Stack:** Adds `expo-image-picker`, `expo-image-manipulator`, `expo-file-system`. No new state-management or UI libraries. Drag-to-reorder uses Reanimated + Gesture Handler (already present from Plan 01).

**Spec reference:** `docs/superpowers/specs/2026-06-02-parchment-flashcard-app-design.md` §5.1 (Home), §5.5 (Deck Editor), §7.1 (decks schema), §7.4 (Image handling).

---

## Task 1: UUID utility

The decks and cards tables use TEXT primary keys we generate client-side. expo-crypto's `randomUUID()` already gives RFC4122 v4 — we just need a tiny wrapper so callers don't have to know the underlying library, and so we can unit-test the shape.

**Files:**
- Create: `src/lib/uuid.ts`
- Test: `src/lib/__tests__/uuid.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/uuid.test.ts`:

```typescript
import { newUuid } from "../uuid";

describe("newUuid", () => {
  it("returns an RFC4122 v4 string", () => {
    const id = newUuid();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("returns different ids on successive calls", () => {
    const a = newUuid();
    const b = newUuid();
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run the test — expect failure**

```bash
npm test -- uuid.test.ts
```

Expected: FAIL — "Cannot find module '../uuid'".

- [ ] **Step 3: Commit the red**

```bash
git add src/lib/__tests__/uuid.test.ts
git commit -m "Task 1 (red): failing tests for newUuid wrapper"
```

- [ ] **Step 4: Implement**

Create `src/lib/uuid.ts`:

```typescript
import * as Crypto from "expo-crypto";

export function newUuid(): string {
  return Crypto.randomUUID();
}
```

- [ ] **Step 5: Run — expect 2/2 pass**

```bash
npm test -- uuid.test.ts
```

- [ ] **Step 6: Commit the green**

```bash
git add src/lib/uuid.ts
git commit -m "Task 1 (green): newUuid wraps expo-crypto.randomUUID"
```

---

## Task 2: decksStore — create, update, delete actions

Three actions on `useDecksStore` that write to SQLite and update the in-memory list. Each must be testable end-to-end against a fake DB. We expand the existing fakeDb to handle `runAsync` for INSERT/UPDATE/DELETE statements.

**Files:**
- Modify: `src/store/decksStore.ts`
- Modify: `src/store/__tests__/decksStore.test.ts`

- [ ] **Step 1: Write the failing tests**

Replace the contents of `src/store/__tests__/decksStore.test.ts` with:

```typescript
import { useDecksStore } from "../decksStore";
import { getDatabase } from "@/db/client";

interface DeckRow {
  id: string; name: string; emoji: string | null; description: string | null;
  cover_image: string | null; shuffle_enabled: number; sort_order: number;
  created_at: number; updated_at: number;
}

const fakeDb = {
  rows: [] as DeckRow[],
  ran: [] as { sql: string; params: unknown[] }[],
  async getAllAsync<T>(_sql: string): Promise<T[]> {
    return this.rows.slice().sort((a, b) =>
      a.sort_order - b.sort_order || a.created_at - b.created_at
    ) as unknown as T[];
  },
  async runAsync(sql: string, ...params: unknown[]) {
    this.ran.push({ sql, params });
    if (/^INSERT INTO decks/i.test(sql)) {
      const [id, name, emoji, description, cover_image, sort_order, created_at, updated_at] = params as [
        string, string, string | null, string | null, string | null, number, number, number,
      ];
      this.rows.push({
        id, name, emoji, description, cover_image,
        shuffle_enabled: 0, sort_order, created_at, updated_at,
      });
    } else if (/^UPDATE decks SET/i.test(sql) && /WHERE id = \?/i.test(sql)) {
      const ps = params as unknown[];
      const id = ps[ps.length - 1] as string;
      const row = this.rows.find((r) => r.id === id);
      if (!row) return;
      if (/name = \?/.test(sql)) row.name = ps[0] as string;
      if (/emoji = \?/.test(sql)) row.emoji = ps[1] as string | null;
      if (/description = \?/.test(sql)) row.description = ps[2] as string | null;
      if (/cover_image = \?/.test(sql)) row.cover_image = ps[3] as string | null;
      row.updated_at = ps[ps.length - 2] as number;
    } else if (/^DELETE FROM decks WHERE id = \?/i.test(sql)) {
      const [id] = params as [string];
      this.rows = this.rows.filter((r) => r.id !== id);
    }
  },
};

jest.mock("@/db/client", () => ({ getDatabase: jest.fn() }));
jest.mock("@/lib/uuid", () => ({ newUuid: jest.fn() }));

const mockedGetDatabase = jest.mocked(getDatabase);
const mockedNewUuid = jest.mocked(require("@/lib/uuid").newUuid);

describe("decksStore", () => {
  beforeEach(() => {
    fakeDb.rows = [];
    fakeDb.ran = [];
    useDecksStore.setState({ decks: [], status: "idle" });
    mockedGetDatabase.mockReset();
    mockedGetDatabase.mockResolvedValue(fakeDb as never);
    mockedNewUuid.mockReset();
    mockedNewUuid.mockReturnValueOnce("uuid-1").mockReturnValueOnce("uuid-2");
  });

  it("starts in idle state with no decks", () => {
    const state = useDecksStore.getState();
    expect(state.decks).toEqual([]);
    expect(state.status).toBe("idle");
  });

  it("loads decks from the database and maps snake_case to camelCase", async () => {
    fakeDb.rows = [
      { id: "d1", name: "Spanish", emoji: "🌿", description: null,
        cover_image: null, shuffle_enabled: 1, sort_order: 0,
        created_at: 1000, updated_at: 1000 },
    ];
    await useDecksStore.getState().load();
    const { decks, status } = useDecksStore.getState();
    expect(status).toBe("ready");
    expect(decks).toHaveLength(1);
    expect(decks[0]).toEqual({
      id: "d1", name: "Spanish", emoji: "🌿", description: null,
      coverImage: null, shuffleEnabled: true, sortOrder: 0,
      createdAt: 1000, updatedAt: 1000,
    });
  });

  it("returns an empty array when the database has no decks", async () => {
    await useDecksStore.getState().load();
    expect(useDecksStore.getState().decks).toEqual([]);
    expect(useDecksStore.getState().status).toBe("ready");
  });

  it("sets status to 'error' and re-throws when the query fails", async () => {
    const failingDb = {
      getAllAsync: jest.fn().mockRejectedValue(new Error("db boom")),
      runAsync: jest.fn(),
    };
    mockedGetDatabase.mockResolvedValueOnce(failingDb as never);
    await expect(useDecksStore.getState().load()).rejects.toThrow("db boom");
    expect(useDecksStore.getState().status).toBe("error");
  });

  it("create() inserts a new deck and appends to the list with the next sort_order", async () => {
    await useDecksStore.getState().load();
    const created = await useDecksStore.getState().create({
      name: "Spanish", emoji: "🌿", description: "Beginner", coverImage: null,
    });
    expect(created.id).toBe("uuid-1");
    expect(created.name).toBe("Spanish");
    expect(created.sortOrder).toBe(0);
    const { decks } = useDecksStore.getState();
    expect(decks).toHaveLength(1);
    expect(decks[0]).toEqual(created);
    expect(fakeDb.ran[0].sql).toMatch(/^INSERT INTO decks/i);
  });

  it("create() assigns sequential sort_order values", async () => {
    await useDecksStore.getState().create({ name: "A", emoji: null, description: null, coverImage: null });
    await useDecksStore.getState().create({ name: "B", emoji: null, description: null, coverImage: null });
    const decks = useDecksStore.getState().decks;
    expect(decks.map((d) => d.sortOrder)).toEqual([0, 1]);
  });

  it("update() writes new fields to the deck and updates in-memory state", async () => {
    await useDecksStore.getState().create({ name: "Old", emoji: "📚", description: null, coverImage: null });
    const before = useDecksStore.getState().decks[0];
    await useDecksStore.getState().update(before.id, { name: "New", emoji: "🌿" });
    const after = useDecksStore.getState().decks[0];
    expect(after.name).toBe("New");
    expect(after.emoji).toBe("🌿");
    expect(after.updatedAt).toBeGreaterThanOrEqual(before.updatedAt);
    expect(fakeDb.ran.some((r) => /^UPDATE decks SET/i.test(r.sql))).toBe(true);
  });

  it("update() throws when the deck id does not exist", async () => {
    await useDecksStore.getState().load();
    await expect(
      useDecksStore.getState().update("missing-id", { name: "X" })
    ).rejects.toThrow(/no deck/i);
  });

  it("delete() removes the deck from SQLite and in-memory state", async () => {
    await useDecksStore.getState().create({ name: "A", emoji: null, description: null, coverImage: null });
    const id = useDecksStore.getState().decks[0].id;
    await useDecksStore.getState().delete(id);
    expect(useDecksStore.getState().decks).toEqual([]);
    expect(fakeDb.ran.some((r) => /^DELETE FROM decks/i.test(r.sql))).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect failures**

```bash
npm test -- decksStore.test.ts
```

Expected: existing 4 tests pass, new tests (`create()`, `update()`, `delete()`) fail with "is not a function" or similar.

- [ ] **Step 3: Commit the red**

```bash
git add src/store/__tests__/decksStore.test.ts
git commit -m "Task 2 (red): failing tests for decksStore create/update/delete"
```

- [ ] **Step 4: Implement the three actions**

Replace the contents of `src/store/decksStore.ts` with:

```typescript
import { create as createStore } from "zustand";
import { getDatabase } from "@/db/client";
import { newUuid } from "@/lib/uuid";

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

export interface DeckInput {
  name: string;
  emoji: string | null;
  description: string | null;
  coverImage: string | null;
}

export interface DeckUpdate {
  name?: string;
  emoji?: string | null;
  description?: string | null;
  coverImage?: string | null;
}

interface DecksState {
  decks: Deck[];
  status: Status;
  load: () => Promise<void>;
  create: (input: DeckInput) => Promise<Deck>;
  update: (id: string, patch: DeckUpdate) => Promise<void>;
  delete: (id: string) => Promise<void>;
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

interface RunnableDb {
  getAllAsync<T>(sql: string): Promise<T[]>;
  runAsync(sql: string, ...params: unknown[]): Promise<unknown>;
}

function asRunnable(db: unknown): RunnableDb {
  return db as RunnableDb;
}

export const useDecksStore = createStore<DecksState>((set, get) => ({
  decks: [],
  status: "idle",
  async load() {
    set({ status: "loading" });
    try {
      const db = asRunnable(await getDatabase());
      const rows = await db.getAllAsync<DeckRow>(
        "SELECT * FROM decks ORDER BY sort_order ASC, created_at ASC;"
      );
      set({ decks: rows.map(rowToDeck), status: "ready" });
    } catch (e) {
      set({ status: "error" });
      throw e;
    }
  },
  async create(input) {
    const db = asRunnable(await getDatabase());
    const id = newUuid();
    const now = Date.now();
    const sortOrder = get().decks.length;
    await db.runAsync(
      `INSERT INTO decks
       (id, name, emoji, description, cover_image, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      id, input.name, input.emoji, input.description, input.coverImage, sortOrder, now, now
    );
    const deck: Deck = {
      id, name: input.name, emoji: input.emoji, description: input.description,
      coverImage: input.coverImage, shuffleEnabled: false,
      sortOrder, createdAt: now, updatedAt: now,
    };
    set({ decks: [...get().decks, deck] });
    return deck;
  },
  async update(id, patch) {
    const existing = get().decks.find((d) => d.id === id);
    if (!existing) throw new Error(`No deck with id ${id}`);
    const db = asRunnable(await getDatabase());
    const now = Date.now();
    const next: Deck = {
      ...existing,
      name: patch.name ?? existing.name,
      emoji: patch.emoji !== undefined ? patch.emoji : existing.emoji,
      description: patch.description !== undefined ? patch.description : existing.description,
      coverImage: patch.coverImage !== undefined ? patch.coverImage : existing.coverImage,
      updatedAt: now,
    };
    await db.runAsync(
      `UPDATE decks SET name = ?, emoji = ?, description = ?, cover_image = ?, updated_at = ? WHERE id = ?;`,
      next.name, next.emoji, next.description, next.coverImage, now, id
    );
    set({ decks: get().decks.map((d) => (d.id === id ? next : d)) });
  },
  async delete(id) {
    const db = asRunnable(await getDatabase());
    await db.runAsync("DELETE FROM decks WHERE id = ?;", id);
    set({ decks: get().decks.filter((d) => d.id !== id) });
  },
}));
```

- [ ] **Step 5: Run — expect all tests pass**

```bash
npm test -- decksStore.test.ts
```

Expected: all 9 decksStore tests pass.

- [ ] **Step 6: Run the full suite**

```bash
npm test
```

Expected: 31 tests pass total (25 prior + 6 new from this task split across the existing + new tests).

- [ ] **Step 7: Commit the green**

```bash
git add src/store/decksStore.ts
git commit -m "Task 2 (green): decksStore.create/update/delete with SQLite writes"
```

---

## Task 3: decksStore — reorder action

Drag-to-reorder calls `reorder(orderedIds)` with the desired full ordering. The store rewrites `sort_order` for every affected row in a single transaction so the DB and the in-memory list stay consistent.

**Files:**
- Modify: `src/store/decksStore.ts`
- Modify: `src/store/__tests__/decksStore.test.ts`

- [ ] **Step 1: Append the failing test to `decksStore.test.ts`**

Inside the existing `describe("decksStore", ...)`, before the closing brace, add:

```typescript
  it("reorder() rewrites sort_order across all listed ids", async () => {
    await useDecksStore.getState().create({ name: "A", emoji: null, description: null, coverImage: null });
    await useDecksStore.getState().create({ name: "B", emoji: null, description: null, coverImage: null });
    mockedNewUuid.mockReturnValueOnce("uuid-3");
    await useDecksStore.getState().create({ name: "C", emoji: null, description: null, coverImage: null });

    const decks = useDecksStore.getState().decks;
    const ids = decks.map((d) => d.id);
    // current order: [uuid-1, uuid-2, uuid-3]
    await useDecksStore.getState().reorder([ids[2], ids[0], ids[1]]);

    const reordered = useDecksStore.getState().decks;
    expect(reordered.map((d) => d.id)).toEqual([ids[2], ids[0], ids[1]]);
    expect(reordered.map((d) => d.sortOrder)).toEqual([0, 1, 2]);
    expect(fakeDb.ran.filter((r) => /^UPDATE decks SET sort_order/i.test(r.sql)).length).toBe(3);
  });

  it("reorder() rejects when the id list length doesn't match the deck count", async () => {
    await useDecksStore.getState().create({ name: "A", emoji: null, description: null, coverImage: null });
    await expect(useDecksStore.getState().reorder([])).rejects.toThrow(/order length/i);
  });
```

You'll also need to teach the fakeDb to record `UPDATE decks SET sort_order = ?` statements. Update the fake's `runAsync` to add this branch BEFORE the existing `UPDATE decks SET name` branch:

Find:
```typescript
    } else if (/^UPDATE decks SET/i.test(sql) && /WHERE id = \?/i.test(sql)) {
```

Replace with:
```typescript
    } else if (/^UPDATE decks SET sort_order = \?/i.test(sql)) {
      const [sort_order, updated_at, id] = params as [number, number, string];
      const row = this.rows.find((r) => r.id === id);
      if (!row) return;
      row.sort_order = sort_order;
      row.updated_at = updated_at;
    } else if (/^UPDATE decks SET/i.test(sql) && /WHERE id = \?/i.test(sql)) {
```

- [ ] **Step 2: Run — expect 2 new failing tests**

```bash
npm test -- decksStore.test.ts
```

- [ ] **Step 3: Commit the red**

```bash
git add src/store/__tests__/decksStore.test.ts
git commit -m "Task 3 (red): failing tests for decksStore reorder"
```

- [ ] **Step 4: Add reorder to the store**

In `src/store/decksStore.ts`, add `reorder` to the `DecksState` interface:

Find:
```typescript
interface DecksState {
  decks: Deck[];
  status: Status;
  load: () => Promise<void>;
  create: (input: DeckInput) => Promise<Deck>;
  update: (id: string, patch: DeckUpdate) => Promise<void>;
  delete: (id: string) => Promise<void>;
}
```

Replace with:
```typescript
interface DecksState {
  decks: Deck[];
  status: Status;
  load: () => Promise<void>;
  create: (input: DeckInput) => Promise<Deck>;
  update: (id: string, patch: DeckUpdate) => Promise<void>;
  delete: (id: string) => Promise<void>;
  reorder: (orderedIds: string[]) => Promise<void>;
}
```

And inside the `createStore<DecksState>` factory body, before the final `}));`, add:

```typescript
  async reorder(orderedIds) {
    const current = get().decks;
    if (orderedIds.length !== current.length) {
      throw new Error(`reorder: order length ${orderedIds.length} != deck count ${current.length}`);
    }
    const db = asRunnable(await getDatabase());
    const now = Date.now();
    const byId = new Map(current.map((d) => [d.id, d]));
    const reordered: Deck[] = orderedIds.map((id, idx) => {
      const deck = byId.get(id);
      if (!deck) throw new Error(`reorder: unknown id ${id}`);
      return { ...deck, sortOrder: idx, updatedAt: now };
    });
    for (const d of reordered) {
      await db.runAsync(
        "UPDATE decks SET sort_order = ?, updated_at = ? WHERE id = ?;",
        d.sortOrder, d.updatedAt, d.id
      );
    }
    set({ decks: reordered });
  },
```

- [ ] **Step 5: Run — expect green**

```bash
npm test -- decksStore.test.ts
```

Expected: 11/11 decksStore tests pass.

- [ ] **Step 6: Commit the green**

```bash
git add src/store/decksStore.ts
git commit -m "Task 3 (green): decksStore.reorder rewrites sort_order in bulk"
```

---

## Task 4: DeckTile component

**Files:**
- Create: `src/components/DeckTile.tsx`
- Create: `src/components/__tests__/DeckTile.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/DeckTile.test.tsx`:

```tsx
import React from "react";
import { render, screen } from "@testing-library/react-native";
import { DeckTile } from "../DeckTile";
import { ThemeProvider } from "@/theme/ThemeProvider";
import type { Deck } from "@/store/decksStore";

function makeDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: "d1",
    name: "Spanish Vocab",
    emoji: "🌿",
    description: null,
    coverImage: null,
    shuffleEnabled: false,
    sortOrder: 0,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe("DeckTile", () => {
  it("renders the deck name, emoji, and card count", () => {
    const deck = makeDeck();
    render(
      <ThemeProvider mode="light">
        <DeckTile deck={deck} cardCount={24} onPress={() => {}} onLongPress={() => {}} />
      </ThemeProvider>
    );
    expect(screen.getByText("Spanish Vocab")).toBeOnTheScreen();
    expect(screen.getByText("🌿")).toBeOnTheScreen();
    expect(screen.getByText(/24 cards/i)).toBeOnTheScreen();
  });

  it("pluralizes the card count correctly", () => {
    render(
      <ThemeProvider mode="light">
        <DeckTile deck={makeDeck()} cardCount={1} onPress={() => {}} onLongPress={() => {}} />
      </ThemeProvider>
    );
    expect(screen.getByText(/1 card$/i)).toBeOnTheScreen();
  });

  it("renders empty count text when cardCount is 0", () => {
    render(
      <ThemeProvider mode="light">
        <DeckTile deck={makeDeck()} cardCount={0} onPress={() => {}} onLongPress={() => {}} />
      </ThemeProvider>
    );
    expect(screen.getByText(/empty/i)).toBeOnTheScreen();
  });

  it("uses a placeholder glyph when emoji is null", () => {
    const deck = makeDeck({ emoji: null });
    render(
      <ThemeProvider mode="light">
        <DeckTile deck={deck} cardCount={0} onPress={() => {}} onLongPress={() => {}} />
      </ThemeProvider>
    );
    expect(screen.getByText("📁")).toBeOnTheScreen();
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
npm test -- DeckTile.test.tsx
```

- [ ] **Step 3: Commit red**

```bash
git add src/components/__tests__/DeckTile.test.tsx
git commit -m "Task 4 (red): failing tests for DeckTile"
```

- [ ] **Step 4: Implement**

Create `src/components/DeckTile.tsx`:

```tsx
import React from "react";
import { View, Text, Pressable, StyleSheet, Image } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF } from "@/theme/fonts";
import type { Deck } from "@/store/decksStore";

interface Props {
  deck: Deck;
  cardCount: number;
  onPress: () => void;
  onLongPress: () => void;
}

function pluralizeCards(n: number): string {
  if (n === 0) return "empty";
  if (n === 1) return "1 card";
  return `${n} cards`;
}

export function DeckTile({ deck, cardCount, onPress, onLongPress }: Props) {
  const { theme } = useTheme();
  const hasCover = !!deck.coverImage;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open deck ${deck.name}`}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.tile, { backgroundColor: theme.colors.bgCard }]}
    >
      {hasCover && (
        <Image source={{ uri: deck.coverImage as string }} style={styles.cover} resizeMode="cover" />
      )}
      <View style={[styles.body, hasCover && styles.bodyWithCover]}>
        <Text style={[styles.emoji, { color: theme.colors.textPrimary }]}>
          {deck.emoji ?? "📁"}
        </Text>
        <Text
          style={[styles.name, { color: theme.colors.textPrimary }]}
          numberOfLines={2}
        >
          {deck.name}
        </Text>
        <Text style={[styles.count, { color: theme.colors.textMuted }]}>
          {pluralizeCards(cardCount)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  cover: {
    width: "100%",
    height: "60%",
  },
  body: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  bodyWithCover: {
    height: "40%",
    padding: 10,
  },
  emoji: {
    fontSize: 22,
  },
  name: {
    fontFamily: FONT_SERIF,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  count: {
    fontFamily: FONT_SERIF,
    fontSize: 11,
    fontStyle: "italic",
  },
});
```

- [ ] **Step 5: Run — expect 4/4 pass**

```bash
npm test -- DeckTile.test.tsx
```

- [ ] **Step 6: Commit green**

```bash
git add src/components/DeckTile.tsx
git commit -m "Task 4 (green): DeckTile renders emoji+name+count with optional cover"
```

---

## Task 5: Home grid

Replace the placeholder body in `src/app/index.tsx` with a `FlatList` of `DeckTile`s. Tapping a tile navigates to `/deck/[id]` (will 404 until Plan 02b adds the screen — that's fine for now). Card count comes from a new selector that returns 0 until Plan 02b lands the cards store.

**Files:**
- Modify: `src/app/index.tsx`

- [ ] **Step 1: Read the current `src/app/index.tsx`** to understand its structure (already done in Plan 01).

- [ ] **Step 2: Replace the placeholder branch**

Open `src/app/index.tsx`. Replace the file's contents with:

```tsx
import React from "react";
import { View, Text, Pressable, StyleSheet, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useDecksStore } from "@/store/decksStore";
import { useTheme } from "@/theme/ThemeProvider";
import { EmptyDeckList } from "@/components/EmptyDeckList";
import { DeckTile } from "@/components/DeckTile";
import { FONT_SERIF } from "@/theme/fonts";

export default function Home() {
  const { theme } = useTheme();
  const decks = useDecksStore((s) => s.decks);
  const router = useRouter();

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.colors.bgApp }]}
      edges={["top", "left", "right"]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Decks</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            {decks.length === 0
              ? "Your library is empty"
              : `${decks.length} ${decks.length === 1 ? "collection" : "collections"}`}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create new deck"
          style={[styles.plus, { backgroundColor: theme.colors.accentPrimary }]}
          onPress={() => router.push("/deck/new")}
        >
          <Text style={[styles.plusGlyph, { color: theme.colors.bgCard }]}>+</Text>
        </Pressable>
      </View>

      {decks.length === 0 ? (
        <EmptyDeckList />
      ) : (
        <FlatList
          data={decks}
          keyExtractor={(d) => d.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.tileWrap}>
              <DeckTile
                deck={item}
                cardCount={0}
                onPress={() => router.push(`/deck/${item.id}`)}
                onLongPress={() => { /* long-press menu added in Task 9 */ }}
              />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  title: {
    fontFamily: FONT_SERIF,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: FONT_SERIF,
    fontSize: 13,
    fontStyle: "italic",
    marginTop: 2,
  },
  plus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  plusGlyph: { fontSize: 24, lineHeight: 26, fontWeight: "300" },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: { gap: 12, marginBottom: 12 },
  tileWrap: { flex: 1 },
});
```

- [ ] **Step 3: Run TS + tests**

```bash
npx tsc --noEmit
npm test
```

Expected: zero TS errors, all tests still pass (31 from prior, no new tests).

- [ ] **Step 4: Commit**

```bash
git add src/app/index.tsx
git commit -m "Task 5: Home renders 2-column FlatList of DeckTiles when decks exist"
```

---

## Task 6: DeckEditor form component

A presentational form used by both create and edit routes. Owns form state, validates name (must be non-empty), and calls back to the parent with the values. No store interaction — that's the route's job.

**Files:**
- Create: `src/components/DeckEditor.tsx`
- Create: `src/components/__tests__/DeckEditor.test.tsx`

- [ ] **Step 1: Failing test**

Create `src/components/__tests__/DeckEditor.test.tsx`:

```tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { DeckEditor } from "../DeckEditor";
import { ThemeProvider } from "@/theme/ThemeProvider";

describe("DeckEditor", () => {
  it("populates fields from the initial values prop", () => {
    render(
      <ThemeProvider mode="light">
        <DeckEditor
          initial={{ name: "Spanish", emoji: "🌿", description: "Beginner", coverImage: null }}
          onSubmit={jest.fn()}
          onCancel={jest.fn()}
        />
      </ThemeProvider>
    );
    expect(screen.getByDisplayValue("Spanish")).toBeOnTheScreen();
    expect(screen.getByDisplayValue("🌿")).toBeOnTheScreen();
    expect(screen.getByDisplayValue("Beginner")).toBeOnTheScreen();
  });

  it("calls onSubmit with the typed values when Save is pressed", () => {
    const onSubmit = jest.fn();
    render(
      <ThemeProvider mode="light">
        <DeckEditor
          initial={{ name: "", emoji: null, description: null, coverImage: null }}
          onSubmit={onSubmit}
          onCancel={jest.fn()}
        />
      </ThemeProvider>
    );
    fireEvent.changeText(screen.getByPlaceholderText(/name/i), "French");
    fireEvent.changeText(screen.getByPlaceholderText(/emoji/i), "🇫🇷");
    fireEvent.changeText(screen.getByPlaceholderText(/description/i), "Intermediate");
    fireEvent.press(screen.getByRole("button", { name: /^save$/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      name: "French", emoji: "🇫🇷", description: "Intermediate", coverImage: null,
    });
  });

  it("does not call onSubmit when the name is blank", () => {
    const onSubmit = jest.fn();
    render(
      <ThemeProvider mode="light">
        <DeckEditor
          initial={{ name: "", emoji: null, description: null, coverImage: null }}
          onSubmit={onSubmit}
          onCancel={jest.fn()}
        />
      </ThemeProvider>
    );
    fireEvent.press(screen.getByRole("button", { name: /^save$/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/name is required/i)).toBeOnTheScreen();
  });

  it("calls onCancel when Cancel is pressed", () => {
    const onCancel = jest.fn();
    render(
      <ThemeProvider mode="light">
        <DeckEditor
          initial={{ name: "X", emoji: null, description: null, coverImage: null }}
          onSubmit={jest.fn()}
          onCancel={onCancel}
        />
      </ThemeProvider>
    );
    fireEvent.press(screen.getByRole("button", { name: /^cancel$/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("converts empty emoji / description text back to null on submit", () => {
    const onSubmit = jest.fn();
    render(
      <ThemeProvider mode="light">
        <DeckEditor
          initial={{ name: "X", emoji: "🌿", description: "Beginner", coverImage: null }}
          onSubmit={onSubmit}
          onCancel={jest.fn()}
        />
      </ThemeProvider>
    );
    fireEvent.changeText(screen.getByPlaceholderText(/emoji/i), "");
    fireEvent.changeText(screen.getByPlaceholderText(/description/i), "");
    fireEvent.press(screen.getByRole("button", { name: /^save$/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      name: "X", emoji: null, description: null, coverImage: null,
    });
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
npm test -- DeckEditor.test.tsx
```

- [ ] **Step 3: Commit red**

```bash
git add src/components/__tests__/DeckEditor.test.tsx
git commit -m "Task 6 (red): failing tests for DeckEditor form"
```

- [ ] **Step 4: Implement**

Create `src/components/DeckEditor.tsx`:

```tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF } from "@/theme/fonts";

export interface DeckEditorValues {
  name: string;
  emoji: string | null;
  description: string | null;
  coverImage: string | null;
}

interface Props {
  initial: DeckEditorValues;
  onSubmit: (values: DeckEditorValues) => void;
  onCancel: () => void;
}

function trimToNull(s: string): string | null {
  const trimmed = s.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function DeckEditor({ initial, onSubmit, onCancel }: Props) {
  const { theme } = useTheme();
  const [name, setName] = useState(initial.name);
  const [emoji, setEmoji] = useState(initial.emoji ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [coverImage] = useState<string | null>(initial.coverImage);
  const [showNameError, setShowNameError] = useState(false);

  const submit = () => {
    if (name.trim().length === 0) {
      setShowNameError(true);
      return;
    }
    setShowNameError(false);
    onSubmit({
      name: name.trim(),
      emoji: trimToNull(emoji),
      description: trimToNull(description),
      coverImage,
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name"
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.accentSoft, backgroundColor: theme.colors.bgCard }]}
        />
        {showNameError && (
          <Text style={[styles.error, { color: theme.colors.accentPrimary }]}>
            Name is required
          </Text>
        )}

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Emoji</Text>
        <TextInput
          value={emoji}
          onChangeText={setEmoji}
          placeholder="Emoji"
          placeholderTextColor={theme.colors.textMuted}
          maxLength={4}
          style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.accentSoft, backgroundColor: theme.colors.bgCard }]}
        />

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Description"
          placeholderTextColor={theme.colors.textMuted}
          multiline
          numberOfLines={3}
          style={[styles.inputMulti, { color: theme.colors.textPrimary, borderColor: theme.colors.accentSoft, backgroundColor: theme.colors.bgCard }]}
        />

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            style={[styles.btnGhost, { borderColor: theme.colors.accentSoft }]}
          >
            <Text style={[styles.btnGhostLabel, { color: theme.colors.textBody }]}>Cancel</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={submit}
            style={[styles.btnPrimary, { backgroundColor: theme.colors.accentPrimary }]}
          >
            <Text style={[styles.btnPrimaryLabel, { color: theme.colors.bgCard }]}>Save</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 4 },
  label: {
    fontFamily: FONT_SERIF,
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 16,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    fontFamily: FONT_SERIF,
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputMulti: {
    fontFamily: FONT_SERIF,
    fontSize: 15,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 80,
    textAlignVertical: "top",
  },
  error: {
    fontFamily: FONT_SERIF,
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 6,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 24,
  },
  btnGhost: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  btnGhostLabel: {
    fontFamily: FONT_SERIF,
    fontSize: 14,
    fontWeight: "600",
  },
  btnPrimary: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
  },
  btnPrimaryLabel: {
    fontFamily: FONT_SERIF,
    fontSize: 14,
    fontWeight: "600",
  },
});
```

- [ ] **Step 5: Run — expect 5/5 pass**

```bash
npm test -- DeckEditor.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add src/components/DeckEditor.tsx
git commit -m "Task 6 (green): DeckEditor form with validation"
```

---

## Task 7: Image utility module

A single module that picks an image from the user's library or camera, downscales it to max 1600px on the long edge, re-encodes to JPEG @ 0.85, and saves it under `documents/images/<uuid>.jpg`. Returns the relative path. UI-testing this on a native module is unwieldy, so we cover the deterministic pieces (filename generation, path resolution) with unit tests and rely on the on-device smoke test for the picker integration.

**Files:**
- Modify: `package.json` (add `expo-image-picker`, `expo-image-manipulator`, `expo-file-system`)
- Create: `src/lib/image.ts`
- Create: `src/lib/__tests__/image.test.ts`

- [ ] **Step 1: Install dependencies**

```bash
npx expo install expo-image-picker expo-image-manipulator expo-file-system
```

Verify with:
```bash
grep -E "expo-image-(picker|manipulator)|expo-file-system" package.json
```

Expected: all three appear under `dependencies`.

- [ ] **Step 2: Write the failing test**

Create `src/lib/__tests__/image.test.ts`:

```typescript
import { buildImagePath, IMAGE_DIR } from "../image";

jest.mock("expo-file-system", () => ({
  documentDirectory: "file:///doc/",
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

describe("image utility", () => {
  it("composes the image directory under documentDirectory", () => {
    expect(IMAGE_DIR).toBe("file:///doc/images/");
  });

  it("buildImagePath creates a unique filename under IMAGE_DIR with .jpg extension", () => {
    const a = buildImagePath();
    const b = buildImagePath();
    expect(a).toMatch(/^file:\/\/\/doc\/images\/[0-9a-f-]+\.jpg$/);
    expect(a).not.toBe(b);
  });

  it("buildImagePath accepts an explicit prefix for cover vs card differentiation", () => {
    const cover = buildImagePath("cover");
    expect(cover).toMatch(/^file:\/\/\/doc\/images\/cover_[0-9a-f-]+\.jpg$/);
  });
});
```

- [ ] **Step 3: Run — expect failure**

```bash
npm test -- image.test.ts
```

- [ ] **Step 4: Commit red**

```bash
git add src/lib/__tests__/image.test.ts package.json package-lock.json
git commit -m "Task 7 (red): failing tests for image utility + install picker/manipulator/file-system"
```

- [ ] **Step 5: Implement**

Create `src/lib/image.ts`:

```typescript
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { newUuid } from "./uuid";

const DOC_DIR = FileSystem.documentDirectory ?? "";
export const IMAGE_DIR = `${DOC_DIR}images/`;

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

export function buildImagePath(prefix?: string): string {
  const tag = prefix ? `${prefix}_` : "";
  return `${IMAGE_DIR}${tag}${newUuid()}.jpg`;
}

async function ensureImageDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(IMAGE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
  }
}

export interface PickedImage {
  path: string;
}

export async function pickAndStoreImage(prefix?: string): Promise<PickedImage | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: false,
    quality: 1,
  });
  if (picked.canceled || picked.assets.length === 0) return null;
  const source = picked.assets[0];

  const manipulated = await ImageManipulator.manipulateAsync(
    source.uri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  );

  await ensureImageDir();
  const destPath = buildImagePath(prefix);
  await FileSystem.copyAsync({ from: manipulated.uri, to: destPath });
  return { path: destPath };
}

export async function deleteImage(path: string | null | undefined): Promise<void> {
  if (!path) return;
  try {
    await FileSystem.deleteAsync(path, { idempotent: true });
  } catch {
    // ignore — file may already be gone
  }
}
```

- [ ] **Step 6: Run — expect 3/3 pass**

```bash
npm test -- image.test.ts
```

- [ ] **Step 7: Commit green**

```bash
git add src/lib/image.ts
git commit -m "Task 7 (green): image pick/resize/save utility with IMAGE_DIR"
```

---

## Task 8: Cover image picker in DeckEditor

Wire the image picker into DeckEditor: a "Choose cover image" button that calls `pickAndStoreImage("cover")` and stores the returned path in form state. A small preview + "Remove" appears when an image is set.

**Files:**
- Modify: `src/components/DeckEditor.tsx`
- Modify: `src/components/__tests__/DeckEditor.test.tsx`

- [ ] **Step 1: Add a test for cover image submission**

Append this test inside the `describe("DeckEditor", ...)` block in `src/components/__tests__/DeckEditor.test.tsx`:

```typescript
  it("preserves the initial coverImage through submit when the user doesn't change it", () => {
    const onSubmit = jest.fn();
    render(
      <ThemeProvider mode="light">
        <DeckEditor
          initial={{ name: "X", emoji: null, description: null, coverImage: "file:///doc/images/cover_abc.jpg" }}
          onSubmit={onSubmit}
          onCancel={jest.fn()}
        />
      </ThemeProvider>
    );
    fireEvent.press(screen.getByRole("button", { name: /^save$/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      coverImage: "file:///doc/images/cover_abc.jpg",
    }));
  });

  it("Remove cover button clears the cover image", () => {
    const onSubmit = jest.fn();
    render(
      <ThemeProvider mode="light">
        <DeckEditor
          initial={{ name: "X", emoji: null, description: null, coverImage: "file:///doc/images/cover_abc.jpg" }}
          onSubmit={onSubmit}
          onCancel={jest.fn()}
        />
      </ThemeProvider>
    );
    fireEvent.press(screen.getByRole("button", { name: /remove cover/i }));
    fireEvent.press(screen.getByRole("button", { name: /^save$/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ coverImage: null }));
  });
```

- [ ] **Step 2: Run — expect failure on the new tests**

```bash
npm test -- DeckEditor.test.tsx
```

- [ ] **Step 3: Commit red**

```bash
git add src/components/__tests__/DeckEditor.test.tsx
git commit -m "Task 8 (red): failing tests for DeckEditor cover image preserve + remove"
```

- [ ] **Step 4: Replace DeckEditor's body to add cover-image UI**

Open `src/components/DeckEditor.tsx`. Replace the file with:

```tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF } from "@/theme/fonts";
import { pickAndStoreImage } from "@/lib/image";

export interface DeckEditorValues {
  name: string;
  emoji: string | null;
  description: string | null;
  coverImage: string | null;
}

interface Props {
  initial: DeckEditorValues;
  onSubmit: (values: DeckEditorValues) => void;
  onCancel: () => void;
}

function trimToNull(s: string): string | null {
  const trimmed = s.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function DeckEditor({ initial, onSubmit, onCancel }: Props) {
  const { theme } = useTheme();
  const [name, setName] = useState(initial.name);
  const [emoji, setEmoji] = useState(initial.emoji ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [coverImage, setCoverImage] = useState<string | null>(initial.coverImage);
  const [showNameError, setShowNameError] = useState(false);
  const [pickingCover, setPickingCover] = useState(false);

  const submit = () => {
    if (name.trim().length === 0) {
      setShowNameError(true);
      return;
    }
    setShowNameError(false);
    onSubmit({
      name: name.trim(),
      emoji: trimToNull(emoji),
      description: trimToNull(description),
      coverImage,
    });
  };

  const chooseCover = async () => {
    setPickingCover(true);
    try {
      const picked = await pickAndStoreImage("cover");
      if (picked) setCoverImage(picked.path);
    } finally {
      setPickingCover(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name"
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.accentSoft, backgroundColor: theme.colors.bgCard }]}
        />
        {showNameError && (
          <Text style={[styles.error, { color: theme.colors.accentPrimary }]}>
            Name is required
          </Text>
        )}

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Emoji</Text>
        <TextInput
          value={emoji}
          onChangeText={setEmoji}
          placeholder="Emoji"
          placeholderTextColor={theme.colors.textMuted}
          maxLength={4}
          style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.accentSoft, backgroundColor: theme.colors.bgCard }]}
        />

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Description"
          placeholderTextColor={theme.colors.textMuted}
          multiline
          numberOfLines={3}
          style={[styles.inputMulti, { color: theme.colors.textPrimary, borderColor: theme.colors.accentSoft, backgroundColor: theme.colors.bgCard }]}
        />

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Cover image</Text>
        {coverImage ? (
          <View style={styles.coverWrap}>
            <Image source={{ uri: coverImage }} style={styles.coverPreview} resizeMode="cover" />
            <Pressable
              accessibilityRole="button"
              onPress={() => setCoverImage(null)}
              style={[styles.btnGhost, { borderColor: theme.colors.accentSoft }]}
            >
              <Text style={[styles.btnGhostLabel, { color: theme.colors.textBody }]}>Remove cover</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={chooseCover}
            disabled={pickingCover}
            style={[styles.btnGhost, { borderColor: theme.colors.accentSoft, opacity: pickingCover ? 0.5 : 1 }]}
          >
            <Text style={[styles.btnGhostLabel, { color: theme.colors.textBody }]}>
              {pickingCover ? "Picking…" : "Choose cover image"}
            </Text>
          </Pressable>
        )}

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            style={[styles.btnGhost, { borderColor: theme.colors.accentSoft }]}
          >
            <Text style={[styles.btnGhostLabel, { color: theme.colors.textBody }]}>Cancel</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={submit}
            style={[styles.btnPrimary, { backgroundColor: theme.colors.accentPrimary }]}
          >
            <Text style={[styles.btnPrimaryLabel, { color: theme.colors.bgCard }]}>Save</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 4 },
  label: {
    fontFamily: FONT_SERIF,
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 16,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    fontFamily: FONT_SERIF,
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputMulti: {
    fontFamily: FONT_SERIF,
    fontSize: 15,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 80,
    textAlignVertical: "top",
  },
  error: {
    fontFamily: FONT_SERIF,
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 6,
  },
  coverWrap: { gap: 10, alignItems: "flex-start" },
  coverPreview: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 10,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 24,
  },
  btnGhost: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  btnGhostLabel: {
    fontFamily: FONT_SERIF,
    fontSize: 14,
    fontWeight: "600",
  },
  btnPrimary: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
  },
  btnPrimaryLabel: {
    fontFamily: FONT_SERIF,
    fontSize: 14,
    fontWeight: "600",
  },
});
```

- [ ] **Step 5: Add a jest mock for the image module so DeckEditor tests don't try to call expo-image-picker**

At the top of `src/components/__tests__/DeckEditor.test.tsx`, ABOVE the existing imports, add:

```typescript
jest.mock("@/lib/image", () => ({
  pickAndStoreImage: jest.fn(async () => null),
}));
```

- [ ] **Step 6: Run — expect 7/7 pass**

```bash
npm test -- DeckEditor.test.tsx
```

- [ ] **Step 7: Commit green**

```bash
git add src/components/DeckEditor.tsx src/components/__tests__/DeckEditor.test.tsx
git commit -m "Task 8 (green): DeckEditor cover image pick/preview/remove"
```

---

## Task 9: New deck route + Home "+" navigation

Wire the `/deck/new` route to render DeckEditor in create mode. The "+" button on Home already calls `router.push("/deck/new")` from Task 5; now the destination exists.

**Files:**
- Create: `src/app/deck/new.tsx`

- [ ] **Step 1: Create the route**

Create `src/app/deck/new.tsx`:

```tsx
import React from "react";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDecksStore } from "@/store/decksStore";
import { useTheme } from "@/theme/ThemeProvider";
import { DeckEditor, type DeckEditorValues } from "@/components/DeckEditor";

export default function NewDeckScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const create = useDecksStore((s) => s.create);

  const handleSubmit = async (values: DeckEditorValues) => {
    await create(values);
    router.back();
  };

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={{ flex: 1, backgroundColor: theme.colors.bgApp }}
    >
      <Stack.Screen options={{ title: "New deck" }} />
      <DeckEditor
        initial={{ name: "", emoji: null, description: null, coverImage: null }}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Run TS check and tests**

```bash
npx tsc --noEmit
npm test
```

Expected: zero TS errors, all 38 tests pass (no new tests in this task; we're wiring).

- [ ] **Step 3: Commit**

```bash
git add src/app/deck/new.tsx
git commit -m "Task 9: /deck/new route renders DeckEditor and creates via store"
```

---

## Task 10: Edit deck route

A second route that loads an existing deck from the store and pre-fills the DeckEditor.

**Files:**
- Create: `src/app/deck/[id]/edit.tsx`

- [ ] **Step 1: Create the route**

Create `src/app/deck/[id]/edit.tsx`:

```tsx
import React from "react";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View } from "react-native";
import { useDecksStore } from "@/store/decksStore";
import { useTheme } from "@/theme/ThemeProvider";
import { FONT_SERIF } from "@/theme/fonts";
import { DeckEditor, type DeckEditorValues } from "@/components/DeckEditor";

export default function EditDeckScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const deck = useDecksStore((s) => s.decks.find((d) => d.id === id));
  const update = useDecksStore((s) => s.update);

  const handleSubmit = async (values: DeckEditorValues) => {
    if (!deck) return;
    await update(deck.id, values);
    router.back();
  };

  if (!deck) {
    return (
      <SafeAreaView
        edges={["bottom", "left", "right"]}
        style={{ flex: 1, backgroundColor: theme.colors.bgApp, alignItems: "center", justifyContent: "center", padding: 24 }}
      >
        <Stack.Screen options={{ title: "Edit deck" }} />
        <View>
          <Text style={{ fontFamily: FONT_SERIF, fontSize: 16, fontStyle: "italic", color: theme.colors.textMuted }}>
            Deck not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={{ flex: 1, backgroundColor: theme.colors.bgApp }}
    >
      <Stack.Screen options={{ title: "Edit deck" }} />
      <DeckEditor
        initial={{
          name: deck.name,
          emoji: deck.emoji,
          description: deck.description,
          coverImage: deck.coverImage,
        }}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
npm test
```

- [ ] **Step 3: Commit**

```bash
git add src/app/deck/[id]/edit.tsx
git commit -m "Task 10: /deck/[id]/edit route pre-fills DeckEditor and updates via store"
```

---

## Task 11: Long-press menu for deck tiles

A long-press on a DeckTile shows an OS-native ActionSheet (iOS) or a small modal sheet (Android) with Edit / Delete options. Deleting prompts for confirmation. Implemented via React Native's `ActionSheetIOS` on iOS and a portable bottom-sheet component on Android (we'll use the `Alert` API as a quick portable fallback for v1 — keeps the dependency footprint zero).

**Files:**
- Modify: `src/app/index.tsx`

- [ ] **Step 1: Wire the long-press handler**

Open `src/app/index.tsx`. Above the component (after imports), add the menu helper:

```tsx
import { Alert, Platform, ActionSheetIOS } from "react-native";

type MenuChoice = "edit" | "delete" | "cancel";

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

function confirmDelete(deckName: string, onConfirm: () => void) {
  Alert.alert(
    `Delete "${deckName}"?`,
    "This will permanently remove the deck and all of its cards.",
    [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onConfirm },
    ]
  );
}
```

Make sure the existing `react-native` import line at the top of the file now includes `Alert, Platform, ActionSheetIOS` — replace the import line with:

```tsx
import {
  View, Text, Pressable, StyleSheet, FlatList,
  Alert, Platform, ActionSheetIOS,
} from "react-native";
```

(Adjust to your existing imports — the goal is to add `Alert`, `Platform`, `ActionSheetIOS` to whatever's already imported from `react-native`.)

- [ ] **Step 2: Wire onLongPress in the FlatList renderItem**

In the Home component, find:

```tsx
              <DeckTile
                deck={item}
                cardCount={0}
                onPress={() => router.push(`/deck/${item.id}`)}
                onLongPress={() => { /* long-press menu added in Task 9 */ }}
              />
```

Replace with:

```tsx
              <DeckTile
                deck={item}
                cardCount={0}
                onPress={() => router.push(`/deck/${item.id}`)}
                onLongPress={() => {
                  showDeckMenu(item.name, (choice) => {
                    if (choice === "edit") router.push(`/deck/${item.id}/edit`);
                    else if (choice === "delete") {
                      confirmDelete(item.name, () => {
                        useDecksStore.getState().delete(item.id).catch((e) => {
                          Alert.alert("Couldn't delete deck", e.message);
                        });
                      });
                    }
                  });
                }}
              />
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
npm test
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/index.tsx
git commit -m "Task 11: long-press DeckTile shows Edit/Delete menu with confirm"
```

---

## Task 12: On-device smoke test

A manual checklist run on the physical Android phone after building a new preview APK via EAS.

**Files:** none — manual verification.

- [ ] **Step 1: Build a fresh preview APK**

```bash
npx eas build --profile preview --platform android
```

Wait for completion, install the APK on the device.

- [ ] **Step 2: Verify the following manually**

1. **First open** → Home empty (`Your library is empty`, EmptyDeckList centered)
2. **Tap "+"** → Navigates to **New deck** screen
3. Type "Spanish Vocab" in Name, `🌿` in Emoji, "Beginner deck" in Description; tap **Save** → returns to Home; one tile labeled "Spanish Vocab" with 🌿, "empty", grid layout active
4. **Tap the tile** → navigates to a 404 / not-found page (Plan 02b will add the deck-detail screen — this is expected)
5. Back to Home. **Long-press the tile** → menu with Edit / Delete appears (or iOS ActionSheet)
6. Choose **Edit** → opens the editor pre-filled with the deck's name, emoji, description; change the name to "Spanish 2", **Save** → returns to Home; tile name updated
7. **Long-press → Delete → Delete (confirm)** → tile disappears, EmptyDeckList re-appears
8. Create two new decks (any names). **Long-press → Edit → Choose cover image → pick a photo → Save** → tile shows the photo at top, name + count below
9. **Force-close + reopen** → the decks persist (load on launch)
10. Toggle phone dark mode → grid + tiles render in the dark palette without restart

- [ ] **Step 3: No commit — manual verification only.**

---

## Self-Review Notes

After writing this plan I cross-checked against the spec (§5.1 Home, §5.5 Deck Editor, §7.1 schema, §7.4 image handling):

- §5.1 Home Grid: Tasks 4, 5 (FlatList of DeckTiles, optional cover image at top of tile, empty state).
- §5.5 Deck Editor: Tasks 6, 8 (name, emoji picker, description, optional cover image picker, Save / Cancel).
- §7.1 Schema: already in place from Plan 01; Tasks 2-3 write to it.
- §7.4 Image handling: Task 7 implements pick + 1600px downscale + JPEG 0.85 + save under `documents/images/`.
- Long-press menu for Edit/Delete: Task 11. Share moves to Plan 04.
- Drag-to-reorder: **deferred to Plan 02b** because it's most naturally implemented alongside card reordering (same component pattern). This is a minor scope adjustment vs. the original five-plan breakdown but keeps related work together.

No placeholders, no TODOs, no references to undefined types. Every test step has a complete code block; every command step has the exact command and expected output. Type names (Deck, DeckInput, DeckUpdate, DeckEditorValues, PickedImage) are defined in early tasks and used consistently in later ones.
