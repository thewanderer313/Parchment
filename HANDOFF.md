# Parchment — Session Handoff

**Last updated:** 2026-06-03 (later in the day)
**Branch:** `master` (HEAD: `259a97d`)
**Test status:** 86/86 unit tests pass · `tsc --noEmit` clean · `npx expo export --platform android` produces a 4.5 MB Hermes bundle

---

## TL;DR for the next Claude

Parchment is a feature-complete v1 cross-platform flashcard app (Expo SDK 56, React Native, TypeScript). All five plan-level features are shipped (foundation, deck CRUD, card CRUD + Markdown, study mode, share + settings) plus a significant amount of UX polish on top. The user has been iterating successfully on a dev-client build via `expo start --tunnel`; they're about to fire a fresh EAS preview build that will include everything in master.

**What's most likely to need attention in the next session:**

- **On-device smoke test of the new preview APK.** The user has been validating each change live via the dev client, but a fresh production-pathway build deserves a quick walkthrough.
- **Decisions about post-v1 direction.** The remaining proposed improvements (auto-save drafts, daily backup snapshot, screen-level integration tests, deck sort/search/bulk select) were laid out and the user said "I don't really see the necessity of the rest of the options just yet." They may want any of these later, or may want to start something new (iOS publish, App Store / Play Store submission, additional Markdown features, etc.).

The user has limited EAS Build slots remaining this month. **Do not burn slots casually** — the dev client + tunnel setup already gives them unlimited JS-only iteration.

---

## What's built (Plans 01–04 + significant post-v1 polish)

### Plans 01–04 (all merged to master)

| Plan | Scope | Merge SHA |
|---|---|---|
| 01 Foundation | Themed Expo app, SQLite v1 schema, Zustand stores, Home grid + EmptyDeckList | `ff3891e` |
| 02a Deck CRUD | DeckTile, DeckEditor with cover image, deck CRUD store + long-press menu | `cef5bab` |
| 02b Card CRUD | cardsStore, MarkdownText (react-native-marked), CardRow, Deck Detail, CardEditor with tabbed Markdown + live preview | `093c9f5` |
| 03 Study Mode | FlipCard (Reanimated 3D rotation 380 ms), swipe/pan gestures, shuffle, windowed dot progress, Reduce Motion support | `b73c53f` |
| 04 Share + Settings | Export/import `.parchment.v1` JSON with base64 images, per-deck share via OS share sheet, /settings with theme toggle + export/import + about | `bd065ec` |

### Post-v1 fixes and polish (the long tail of the current session)

Listed newest first — the EAS build the user is about to make contains all of these:

| SHA | What |
|---|---|
| `259a97d` | Composer: "Copy / show JSON" button so you can move the whole deck as text rather than as a file |
| `0b4df96` | Home: + button now opens "Add a deck" with **Create / Import from file / Import from text** (consolidates the import button into +) |
| `7601c0f` | Settings: "Import deck from text…" — paste-JSON modal that bypasses the file picker entirely |
| `1b27163` | Card Editor: 7-button toolbar (B / I / H / • / 1. / `</>` / 🔗) that inserts at the cursor instead of appending to the end |
| `7c4c1f0` | `tools/parchment-composer.html` — single-file desktop composer for writing decks with a real keyboard, exports `parchment.v1` JSON |
| `2f84d8c` | Share + import hardening: drop `.parchment.json` double extension → just `.json`, explicit UTF-8 reads, BOM-tolerant parser, friendlier errors |
| `fd90184` | Drag-to-reorder cards via a ≡ grip handle on each card row in Deck Detail (uses react-native-draggable-flatlist) |
| `aaa573b` | "Discard changes?" prompt when leaving a dirty deck or card editor (`useUnsavedChangesGuard` hook) |
| `0fd91e9` | Per-deck shuffle now persists via `decksStore.setShuffleEnabled` |
| `0d9bd95` | Deck Detail header gains a ⋮ menu button (Edit / Share / Delete from inside the deck) |
| `63dab63` | Custom bottom-sheet `ActionSheet` component replacing `Alert.alert` for menus — fixes Android's 4-button cap that was clipping Delete |
| `6b6bfb4` | Render-loop fix in Deck Detail: stable `EMPTY_CARDS` reference for the cards selector (this was THE crash bug the previous preview APK had) |
| `4e64928` | Top-level `ErrorBoundary` so JS errors show on screen instead of crashing the app silently |
| `53afa0f` | `babel.config.js` with `react-native-worklets/plugin` (Reanimated v4 requirement); `expo-image-picker` + `expo-document-picker` config plugins; try/catch on `cardsStore` loads |
| `4ef75f9` | `ImagePicker.MediaTypeOptions.Images` → `["images"]` (SDK 56 modernization); Study screen defensive `loadByDeck` |
| `878bbd0` | **Critical SDK 56 fix:** switched all `expo-file-system` imports to `expo-file-system/legacy` (the main entry's shims throw at runtime) |
| `d7baea5` | Install `react-native-svg` peer dep for `react-native-marked` |

---

## Current state of import/export

This bit has its own complexity worth flagging:

- **Export full library** lives in Settings → "Export library…"
- **Share single deck** lives in deck long-press menu and Deck Detail ⋮ menu → Share
- **Import** has **two paths** because the file-picker chain has been flaky on Android with files received via messaging:
  - **From file** (Settings or Home + → "Import deck from file…") — uses `expo-document-picker` + `expo-file-system/legacy`
  - **From text** (Settings or Home + → "Import deck from text…") — pastes JSON into a modal with a monospace TextInput, bypasses file system entirely

The user has hit "couldn't import" errors with the file path that we suspect are environmental (URI permissions, MIME types, email-download path). The paste path is the workaround. The desktop composer's "Copy / show JSON" button is designed to round-trip with paste-import perfectly.

Shared logic lives in `src/lib/useDeckImport.ts` (hook exposing `importFromFile`, `importFromText`, `busy`) and `src/components/PasteImportModal.tsx` (themed modal). Both Settings and Home consume both.

---

## Desktop composer (`tools/parchment-composer.html`)

Separate from the app — a single 28 KB self-contained HTML file. No install, no internet required, no dependencies. Lives in `tools/` for organization.

Features:
- Forest-on-Parchment theme matching the app
- Deck metadata (name, emoji, description, cover image)
- Any number of cards with Front + Back Markdown
- Inline live Markdown preview per side
- Full toolbar per side (B, I, H, •, 1., `</>`, 🔗)
- One image per card side (base64-inlined)
- Save / Load draft via browser localStorage
- "Download .json" writes a file
- "Copy / show JSON" reveals a textarea + clipboard-copy button — the round-trip partner for the app's paste-import

Open by double-clicking the HTML file. Works in any modern browser.

---

## Tools / environment (saved across sessions)

| What | State |
|---|---|
| Expo SDK | 56 (latest stable) |
| EAS account | `thewanderer313` (free tier; **limited monthly slots**) |
| EAS project ID | `b22e96f9-f836-4b0f-94aa-5dfe5a8b7be2` |
| ngrok auth token | Persisted as Windows user env var `NGROK_AUTHTOKEN` via `setx` |
| Computer | Windows 11, accessed remotely via Parsec |
| Phone | Android (USB port broken — Wi-Fi tunnel only) |
| Tunnel | `npx expo start --tunnel` works once the env var is set |
| Branch strategy | Each plan was a feature branch; current `master` is the only branch to care about |

---

## Key files for orientation

### Routes (`src/app/`)
- `_layout.tsx` — root: theme provider, hydration with cancel guard, top-level `ErrorBoundary`
- `index.tsx` — Home (deck grid + Settings + + button with "Add a deck" sheet)
- `deck/[id]/index.tsx` — Deck Detail (header with ⋮ menu, Study / Add card buttons, draggable card list)
- `deck/[id]/study.tsx` — Study Mode (FlipCard + Pan gestures + persisted shuffle)
- `deck/[id]/edit.tsx` — Deck Editor route (uses `useUnsavedChangesGuard`)
- `deck/new.tsx` — New deck route
- `deck/[id]/card/[cardId]/edit.tsx` — Card Editor route
- `deck/[id]/card/new.tsx` — New card route
- `settings.tsx` — Theme toggle + Export library + Import (file + text) + About

### Components (`src/components/`)
- `DeckTile.tsx` — Home grid item
- `DeckEditor.tsx` — Deck form with cover image picker; emits `onDirtyChange`
- `CardRow.tsx` — Deck Detail item with optional drag grip
- `CardEditor.tsx` — Tabbed Markdown editor (Front/Back), 7-button cursor-aware toolbar, image picker; emits `onDirtyChange`
- `MarkdownText.tsx` — Wraps `react-native-marked` with our theme; empty state placeholder
- `FlipCard.tsx` — Reanimated 3D rotation
- `EmptyDeckList.tsx` — Home empty state
- `ActionSheet.tsx` — Custom bottom-sheet replacing `Alert.alert` for menus
- `PasteImportModal.tsx` — Shared modal for paste-import (used by Home + Settings)
- `ErrorBoundary.tsx` — Top-level diagnostic that shows JS errors on screen

### Stores (`src/store/`)
- `decksStore.ts` — load / create / update / delete / reorder / setShuffleEnabled
- `cardsStore.ts` — loadByDeck / loadCounts / create / update / delete / reorder
- `settingsStore.ts` — themeMode persistence

### Libraries (`src/lib/`)
- `uuid.ts` — wraps `expo-crypto.randomUUID`
- `image.ts` — pickAndStoreImage (pick → resize 1600px → JPEG 0.85 → save)
- `export.ts` — exportLibrary / exportDeck → `parchment.v1` JSON
- `import.ts` — parseAndPlanImport / applyImport with collision resolution
- `share.ts` — writeAndShare / pickImportFile (`.json` extension, UTF-8)
- `useDeckImport.ts` — hook exposing both file and text import paths
- `useUnsavedChangesGuard.ts` — discard-changes prompt on nav back
- `useReduceMotion.ts` — subscribes to AccessibilityInfo

### SQLite (`src/db/`)
- `schema.ts` — v1 schema (decks / cards / settings tables)
- `migrations.ts` — idempotent migration runner using transactions
- `client.ts` — singleton `getDatabase()` with `PRAGMA foreign_keys = ON`

### Theme (`src/theme/`)
- `palette.ts` — Forest on Parchment light + dark + `THEME_SELECTIONS`
- `ThemeProvider.tsx` — Provider + `useTheme` hook
- `fonts.ts` — `FONT_SERIF = "Georgia"` (single source of truth)

### Desktop tool
- `tools/parchment-composer.html` — standalone composer (see above)

### Docs
- `docs/superpowers/specs/2026-06-02-parchment-flashcard-app-design.md` — original design spec
- `docs/superpowers/plans/2026-06-02-parchment-{01-foundation,02a-deck-crud,02b-card-crud,03-study-mode,04-share-and-settings}.md` — five plan documents
- `HANDOFF.md` — this file

---

## Things explicitly deferred or skipped

The user has either explicitly OK'd these as out-of-scope or chosen not to pursue them right now:

- **Drag-to-reorder for decks on Home.** `react-native-draggable-flatlist` doesn't support `numColumns` and Home's 2-column grid is part of the spec. Would need either a single-column UX redesign, a different library, or a dedicated "Reorder decks" screen.
- **App icon and splash artwork.** User explicitly likes the default Expo icon. Don't change without asking.
- **iOS build / TestFlight / App Store submission.** Not requested.
- **README content.** No request yet.
- **Cloud-relay share links.** Brainstormed in the spec as Option B but the user picked Option A (file-based) for v1.
- **Robustness improvements.** Auto-save drafts, daily backup snapshot, screen-level integration tests. The user said "I don't really see the necessity of the rest of the options just yet."
- **Quality-of-life improvements.** Deck sort, search, bulk select. Same — deferred for now.

---

## Hard-won knowledge — do NOT do these

1. **Don't import from `expo-file-system` main entry.** All path-based methods (`readAsStringAsync`, `writeAsStringAsync`, `documentDirectory`, `copyAsync`, `deleteAsync`, `getInfoAsync`, `makeDirectoryAsync`, `EncodingType`) throw at runtime in SDK 56. Use `expo-file-system/legacy` for everything string-path. We're committed to this — don't try to "modernize" it back.
2. **Don't re-enable React Compiler.** `"reactCompiler": true` in `app.json` experiments is unstable with Reanimated v4 release builds. We removed it.
3. **Don't use inline `?? []` or `?? {}` in Zustand selectors.** Hoist to a module-level constant (`EMPTY_CARDS`, etc.) to keep references stable. This was a critical crash bug (`6b6bfb4`).
4. **Don't use `Alert.alert` with 4 buttons.** Android's native AlertDialog has a hard cap of 3 buttons. The 4th is silently dropped. Use the custom `ActionSheet` component (`63dab63`).
5. **Don't burn EAS builds without strong justification.** The user is rate-limited and prefers JS-only iteration via the dev client + tunnel until a build is genuinely needed.
6. **Don't try to remove the `as never` casts on route paths.** Expo's `.expo/types/router.d.ts` is a build artifact regenerated by the dev server; it's chronically stale. Casts are runtime-safe.
7. **Don't append toolbar syntax to the end of the editor.** Use the per-side `selection` state in `CardEditor.tsx` to insert at the cursor.

---

## Persistent memory location

`C:/Users/Ryank/.claude/projects/C--Users-Ryank-Desktop-Vibe-Coding-Flashcard/memory/`

- `user_expo.md` — user has prior Expo experience but wants explicit CLI walkthroughs
- `project_build_quota.md` — user is rate-limited on EAS builds; prefer dev client + tunnel for iteration

---

## Pre-build sanity check that just passed

```
git status                  → clean
git log --oneline -10       → all commits in master
npm test                    → 86 / 86 passing in 16 suites
npx tsc --noEmit            → 0 errors
npx expo export --platform android → 4.5 MB Hermes bundle, no warnings
```

The next preview build (`npx eas build --profile preview --platform android`) should ship cleanly.
