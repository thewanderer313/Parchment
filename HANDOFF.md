# Parchment — Session Handoff

**Last updated:** 2026-06-03
**Branch:** `master` (HEAD: `6b6bfb4`)
**Test status:** 80/80 pass, `tsc --noEmit` clean, `npx expo export --platform android` bundles cleanly

---

## TL;DR for the next Claude

Parchment is a complete v1 cross-platform flashcard app (Expo SDK 56, React Native, TypeScript). All five planned chunks are merged to `master`. The codebase compiles, tests pass, and the production bundle builds.

**We just diagnosed and fixed a critical render-loop crash** in the Deck Detail screen via a live dev-client session. The fix is committed (`6b6bfb4`) but the user's installed EAS preview APK was built before the fix — it still has the crash. They need to either keep validating with the dev client over the tunnel OR run one more EAS preview build to ship the patched APK.

**The user has limited EAS build slots remaining this month.** Do not burn a slot casually.

---

## What's built (Plans 01–04, all merged to master)

| Plan | Scope | Merge SHA |
|---|---|---|
| 01 Foundation | Themed Expo app, SQLite v1 schema, Zustand stores, Home grid + EmptyDeckList | `ff3891e` |
| 02a Deck CRUD | DeckTile, DeckEditor with cover image, deck CRUD via store + long-press menu | `cef5bab` |
| 02b Card CRUD | cardsStore, MarkdownText (react-native-marked), CardRow, Deck Detail, CardEditor with tabbed Markdown + live preview | `093c9f5` |
| 03 Study Mode | FlipCard (Reanimated 3D rotate 380ms), swipe/pan gestures, shuffle, windowed dot progress, Reduce Motion support | `b73c53f` |
| 04 Share + Settings | Export/import `.parchment` JSON with base64 images, per-deck share via OS share sheet, /settings with theme toggle + export/import + about | `bd065ec` |

---

## Where we are right now in the debugging conversation

1. User's first EAS preview build failed at the JS bundle phase — missing `react-native-svg` peer dep for `react-native-marked`. **Fixed** (committed `d7baea5`).
2. Second EAS preview build succeeded and installed on the user's Android phone. App ran, user could:
   - Change the theme ✓
   - Create decks ✓
   - **Crashed silently when opening a deck**
3. I made several blind hardening passes ahead of any diagnostic data:
   - `878bbd0` — switched all `expo-file-system` imports from the main entry to `expo-file-system/legacy` (CRITICAL — SDK 56's main entry calls throw at runtime)
   - `53afa0f` — added `babel.config.js` with `react-native-worklets/plugin` (required for Reanimated 4), dropped `reactCompiler: true`, added `expo-image-picker` + `expo-document-picker` config plugins, wrapped `cardsStore.loadByDeck` + `loadCounts` in try/catch
   - `4ef75f9` — `ImagePicker.MediaTypeOptions.Images` → `["images"]` (SDK 56 modernization), Study screen defensive `loadByDeck` + stable EMPTY_CARDS ref
   - `4e64928` — top-level `ErrorBoundary` (`src/components/ErrorBoundary.tsx`) that displays the error+stack on screen instead of letting the app close silently
4. The user could not capture a stack trace via USB (USB port broken) and was on a different network from the computer (remoted via Parsec). After fighting with ngrok auth (their global `ngrok` is an ancient v2.3.41 that doesn't recognize `config`), we eventually got the dev client + tunnel working via:
   - User signed up for free ngrok, persisted `NGROK_AUTHTOKEN` via `setx` to Windows user env
   - One EAS development build (~1 slot) installed on phone
   - `npx expo start --tunnel` with `--dev-client` mode
5. **The actual bug surfaced clearly via ErrorBoundary:**
   ```
   The result of getSnapshot should be cached to avoid an infinite loop
   useStore (zustand/react.js)
   DeckDetailScreen (src/app/deck/[id]/index.tsx)
   …Maximum update depth exceeded.
   ```
   `src/app/deck/[id]/index.tsx` had `const cards = useCardsStore((s) => s.cardsByDeck[id ?? ""] ?? []);` — the inline `?? []` creates a brand-new empty array reference every render. Zustand's `useSyncExternalStore` contract requires `getSnapshot` to return a stable value when state is unchanged; the new array fails that check → React schedules another render → selector returns yet another new `[]` → infinite loop → React's "Maximum update depth exceeded" → on Android release, silent JS-engine exit.
6. **Fix committed at `6b6bfb4`:** hoisted `EMPTY_CARDS` to module scope. The Study screen got the same treatment in an earlier audit pass (had the same bug there); Deck Detail was missed.
7. User left, asked for this handoff doc, will pick up with a fresh Claude session.

---

## What the next Claude should do first

1. **Ask the user the current state of the tunnel session.** It may have been closed; if so, they re-open with `npx expo start --tunnel` (the env var is persisted, no need to set anything else). The dev client APK on their phone connects via `exp+parchment://expo-development-client/?url=…`.
2. **Have them reload the JS** (shake phone → Reload, or `R` twice in Metro). The fix at `6b6bfb4` should be picked up automatically. Then test the deck-open flow.
3. **If Deck Detail now works, walk them through a full smoke test** (see checklist below). Fix any further issues found via the dev client — every JS fix is free now, only a new EAS build costs a slot.
4. **When the user is confident the dev client behavior is solid,** suggest one final `npx eas build --profile preview --platform android` to ship a clean preview APK that includes all fixes. That's the production-ready artifact.

**Do NOT re-run my earlier diagnostics or guess at native-layer causes.** The root bug is found and fixed. Trust it.

---

## Smoke test checklist

When the dev client (or a fresh preview build) is live on the phone:

1. **Boot** — App opens to parchment-cream Home, "Decks" header, italic "Your library is empty" subtitle, 📚 + "Tap + to create your first deck" body
2. **Create deck** — Tap + → "New deck" → enter Name, Emoji, Description → Save → tile appears
3. **Open deck (the bug)** — Tap tile → Deck Detail with emoji + name header, Study (disabled), + Add card; 🎴 empty placeholder. **Should no longer crash.**
4. **Create card** — Tap + Add card → Card Editor with Front/Back tabs, Markdown TextInput, syntax toolbar (B/I/•/`</>`), live preview below; type **bold** on Front, "answer" on Back → Save → returns to Deck Detail with card row
5. **Study mode** — Tap Study (now enabled) → full-screen card, tap to flip with 3D animation, swipe horizontally between cards, tap ⇄ to shuffle, × or back to exit
6. **Edit / delete card** — Long-press a card row → Edit / Delete sheet → confirm Delete clears it
7. **Edit / delete / share deck** — Long-press deck tile (from Home) → Edit / Share / Delete sheet → Share → OS share sheet with a `.parchment.json` file
8. **Cover image** — Edit deck → Choose cover image → grant photo permission → pick photo → preview → Save → tile now has the photo
9. **Persistence** — Force-close → reopen → everything intact
10. **Dark mode** — Phone Settings → dark mode → app re-renders dark palette without restart
11. **Settings** — Home → ⚙ → Theme segment toggle works (System/Light/Dark), Export library opens share sheet, Import library opens file picker
12. **Reduce Motion** — Accessibility setting on → flip becomes cross-fade, swipes instant

---

## Tools / environment (saved across sessions)

| What | State |
|---|---|
| Expo SDK | 56 (latest stable) |
| EAS account | `thewanderer313` (Expo free tier, monthly quota; user has limited slots remaining) |
| Project EAS ID | `b22e96f9-f836-4b0f-94aa-5dfe5a8b7be2` |
| ngrok auth token | Persisted as Windows user env var `NGROK_AUTHTOKEN` via `setx` (so future tunnels Just Work) |
| Computer | Windows 11, accessed remotely via Parsec |
| Phone | Android, USB port broken, Wi-Fi only |
| Tunnel | `npx expo start --tunnel` works once the env var is set; phone connects via `exp+parchment://…` URL |
| Branch strategy | Each plan was on its own `plan-XX-…` branch, merged with `--no-ff` to master; `master` is the only branch you should care about now |

---

## Key files for orientation

- `docs/superpowers/specs/2026-06-02-parchment-flashcard-app-design.md` — design spec, brainstormed and approved at the start of the project
- `docs/superpowers/plans/2026-06-02-parchment-{01-foundation,02a-deck-crud,02b-card-crud,03-study-mode,04-share-and-settings}.md` — five plan documents
- `src/app/_layout.tsx` — root: theme provider, hydration, top-level ErrorBoundary
- `src/app/index.tsx` — Home (deck grid + gear + create)
- `src/app/deck/[id]/index.tsx` — Deck Detail (the bug lived here, now fixed)
- `src/app/deck/[id]/study.tsx` — Study mode (FlipCard + Pan gestures)
- `src/app/settings.tsx` — Settings (theme + export/import)
- `src/components/{DeckTile,DeckEditor,CardRow,CardEditor,MarkdownText,FlipCard,EmptyDeckList,ErrorBoundary}.tsx` — components
- `src/store/{decksStore,cardsStore,settingsStore}.ts` — Zustand stores
- `src/lib/{uuid,image,export,import,share,useReduceMotion}.ts` — utilities
- `src/db/{schema,migrations,client}.ts` — SQLite
- `src/theme/{palette,fonts,ThemeProvider}.ts(x)` — theme system

---

## Intentionally deferred (do not implement unless user asks)

- App icon stays as Expo default (user explicitly said they like it)
- Per-deck shuffle preference persistence (currently component-state only; resets when leaving Study)
- Drag-to-reorder UI for decks and cards (long-press menu has Edit/Delete only)
- iOS build / TestFlight / App Store submission
- README content
- Cloud-relay share links (deferred from the original spec; only file-based sharing is in)

---

## Hard-won knowledge — do NOT do these

1. **Don't import from `expo-file-system` main entry.** All path-based methods (`readAsStringAsync`, `writeAsStringAsync`, `documentDirectory`, `copyAsync`, `deleteAsync`, `getInfoAsync`, `makeDirectoryAsync`, `EncodingType`) throw at runtime in SDK 56. Use `expo-file-system/legacy` for everything string-path. We're committed to this and it's working — don't try to "modernize" it back.
2. **Don't re-enable React Compiler.** `"reactCompiler": true` in `app.json` experiments is unstable with Reanimated v4 release builds. We removed it.
3. **Don't use inline `?? []` or `?? {}` in Zustand selectors.** Hoist to a module-level constant (e.g., `EMPTY_CARDS`) to keep references stable. This was THE bug. Same applies to any future store consumer.
4. **Don't burn EAS builds without strong justification.** The user is rate-limited and prefers JS-only iteration via the dev client + tunnel until the next build is genuinely needed.
5. **Don't try to remove the `as never` casts on route paths.** Expo's `.expo/types/router.d.ts` is a build artifact regenerated by the dev server; it's chronically stale. Casts are runtime-safe. Leave them.

---

## Recent commits (most recent first)

```
6b6bfb4 fix(critical): stable EMPTY_CARDS reference in Deck Detail to prevent render loop
4e64928 diag: top-level ErrorBoundary so silent crashes surface on screen
53afa0f fix(critical): babel reanimated plugin + image-picker/document-picker plugins
4ef75f9 chore: audit fixes — ImagePicker SDK 56 + Study screen safety
878bbd0 fix(critical): switch from expo-file-system to expo-file-system/legacy
d7baea5 fix(critical): install react-native-svg peer dep for react-native-marked
471f680 chore: register expo-sharing plugin auto-added by expo install (Plan 04)
bd065ec Plan 04 (Share + Settings): merge plan-04-share-and-settings into master
b73c53f Plan 03 (Study Mode): merge plan-03-study-mode into master
093c9f5 Plan 02b (Card CRUD): merge plan-02b-card-crud into master
cef5bab Plan 02a (Deck CRUD): merge plan-02a-deck-crud into master
ff3891e Plan 01 (Foundation): merge plan-01-foundation into master
```

---

## Persistent memory location

`C:/Users/Ryank/.claude/projects/C--Users-Ryank-Desktop-Vibe-Coding-Flashcard/memory/`

- `user_expo.md` — user has prior Expo experience but wants explicit CLI walkthroughs
- `project_build_quota.md` (added with this handoff) — user is rate-limited on EAS builds this month; prefer dev client + tunnel for iteration
