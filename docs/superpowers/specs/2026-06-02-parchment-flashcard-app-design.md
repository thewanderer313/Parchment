# Parchment — Flashcard App Design Spec

**Date:** 2026-06-02
**Working title:** Parchment
**One-line description:** A minimal, cross-platform flashcard app with a calm, study-paper aesthetic.

---

## 1. Overview

Parchment is a personal flashcard app for Android and iOS. The goal is a calm, beautiful, account-free study tool that supports many kinds of cards — terms and definitions, open-ended prompts, and step-by-step procedural cards — without imposing a study system, schedule, or gamification on the user.

The core promise: open it, swipe through cards, learn. No accounts, no notifications, no streaks. Nothing nags.

### Design principles

1. **Quiet over flashy** — every animation is tuned to feel calm; nothing demands attention.
2. **Local-first** — the user owns their data. No accounts, no cloud, no sync by default.
3. **Forgiving** — Markdown editing has a live preview so users who don't know the syntax can still write formatted text.
4. **Long-session comfort** — earth-tone palette, dark mode, no haptics or pings during study.

---

## 2. In Scope (v1)

1. **Decks (collections):** create, rename, delete, reorder, set emoji + optional description + optional cover image.
2. **Cards:** create, edit, delete, reorder within a deck. Each card has a front and a back, each side supporting Markdown-formatted text and zero or one image (schema supports many for future).
3. **Study mode:** open a deck → full-screen card view → tap to flip with a horizontal 3D animation → swipe horizontally between cards. Shuffle toggle per-deck.
4. **Home screen:** 2-column grid of deck tiles. Tiles show emoji + name + card count; cover image fills the top portion when present.
5. **Theming:** Forest on Parchment (light) + a dark companion palette. System / light / dark options.
6. **Backup & restore:** export entire library or share a single deck as a `.parchment` file (self-contained JSON with inlined images). Import via OS file picker.
7. **Per-deck sharing:** OS share sheet sends a `.parchment` file via any channel (Messages, email, AirDrop, Drive, etc.). Recipient taps the file → Parchment opens → "Import this deck?"
8. **Settings:** theme mode, export library, import library, about.

---

## 3. Out of Scope (v1)

- Spaced repetition / review scheduling (Anki-style)
- Quiz mode, typed answers, scoring
- Audio attachments on cards
- Cloud sync, accounts, login, social features
- Notifications, streaks, badges, gamification
- Public deck library, discovery, follow lists
- Multi-image per card side (UI-only; schema supports it)
- Cloud-relay share links (file-based sharing only in v1)
- Haptic feedback on flips

---

## 4. Visual Design

### Aesthetic: Forest on Parchment

Warm parchment backgrounds with rich forest-green accents — library-quiet, study-room feel.

#### Light palette
| Token | Hex | Use |
|---|---|---|
| `bg.app` | `#e8dec5` | App background |
| `bg.card` | `#f5ecd4` | Cards, tiles, sheets |
| `text.primary` | `#1f3024` | Headings, card front text |
| `text.body` | `#2a3b2e` | Body text |
| `text.muted` | `#4a6b48` | Hints, labels, italic accents |
| `accent.primary` | `#2f4a35` | Buttons, active dots, primary actions |
| `accent.soft` | `#c9bf9f` | Inactive dots, dividers |

#### Dark palette (companion)
| Token | Hex | Use |
|---|---|---|
| `bg.app` | `#1a1f1b` | App background |
| `bg.card` | `#252b26` | Cards, tiles, sheets |
| `text.primary` | `#f0e6cf` | Headings, card front text |
| `text.body` | `#d8cfb8` | Body text |
| `text.muted` | `#8aa37e` | Hints, labels |
| `accent.primary` | `#7fb087` | Buttons, active dots |
| `accent.soft` | `#3a4438` | Inactive dots, dividers |

### Typography
- Serif (Georgia / Charter / Iowan Old Style) for card body text and headings — anchors the parchment feel.
- System sans-serif for UI chrome (top bars, buttons, labels) — preserves platform readability.
- Italic serif for "hints" and metadata (e.g., "tap to flip", "24 cards").

---

## 5. Screens & Navigation

Navigation uses `expo-router` (file-based routing).

```
[ Home — Deck Grid ]
        |
        +-- tap deck ----------> [ Deck Detail ]
        |                              |
        |                              +-- "Study" button -----> [ Study Mode ]
        |                              +-- tap card row --------> [ Card Editor ]
        |                              +-- "+" -----------------> [ Card Editor ] (new)
        |
        +-- "+" --------------> [ Deck Editor ] (new)
        |
        +-- gear icon --------> [ Settings ]
```

### 5.1 Home — Deck Grid
- 2-column grid of deck tiles
- Header: "Decks" title, "+" button (create deck), gear icon (Settings)
- Tile shows emoji + name + "N cards". If cover image set, top ~60% of tile renders the image (rounded top corners), bottom holds the metadata
- Long-press a tile → context menu: Edit / Share / Delete
- Empty state: soft illustration + "Tap + to create your first deck"

### 5.2 Deck Detail
- Header: deck emoji + name; large "Study" button
- Body: list of card rows showing front text preview + small image thumbnail if present
- Tap row → open Card Editor for that card. "+" → new card. Drag handle → reorder. Long-press row → context menu (Edit / Delete), matching the gesture used on deck tiles
- Toolbar actions: Share deck, Edit deck info, Delete deck

### 5.3 Study Mode
- Full-screen card; Forest on Parchment palette
- Tap card → horizontal 3D flip (front ↔ back)
- Swipe left/right → next / previous card with a 280 ms slide-fade
- Swipe down → close to Deck Detail (iOS-native pattern); × button also closes (Android primary)
- Top bar: deck name + "Card 7 of 24" + shuffle icon (⇄) + close (×)
- Bottom: 4-dot windowed progress indicator + ‹ prev / next ›
- **No timer, no streak, no scoring**

### 5.4 Card Editor (live split-screen Markdown)
- Two tabs at top: "Front" / "Back"
- For each side:
  - **Top pane (~60%):** raw Markdown text area with format toolbar (**B**, *I*, •, `</>`) that inserts the syntax for users unfamiliar with Markdown
  - **Bottom pane (~40%):** live rendered preview, scroll-synced with the editor
  - Optional image picker
- Small "?" icon next to the toolbar opens a one-screen Markdown cheat sheet
- Save / Cancel in header

### 5.5 Deck Editor
- Fields: name, emoji picker, optional description, optional cover image picker
- Save / Cancel in header

### 5.6 Settings
- Theme: System / Light / Dark (segmented control)
- Export full library → triggers OS share sheet with `.parchment` file
- Import library → OS file picker
- About: version, "Made for quiet studying."

---

## 6. Motion & Feel

All animations run on the UI thread via React Native Reanimated 3.

| Interaction | Animation | Duration | Easing |
|---|---|---|---|
| Tap card to flip | Horizontal 3D Y-axis rotation | 380 ms | easeInOut cubic |
| Swipe to next/previous card | Slide + slight fade on outgoing | 280 ms | low-tension spring |
| Open deck (Home → Deck Detail) | Cross-fade + 4% scale-up on destination | 250 ms | easeOut |
| Start study (Deck → Study) | Same screen transition as above | 250 ms | easeOut |
| Theme switch | Cross-fade background and text colors | 200 ms | linear |
| Long-press menus / sheets | Platform-default sheet animations | n/a | OS |

**Accessibility:** When the OS `Reduce Motion` setting is on, flips become cross-fades, swipes become instant, and screen transitions collapse to near-instant cross-fades. The app functions identically without animation.

**No haptics, no notifications, no badges, no sounds.** Ever.

---

## 7. Data Model

Storage: **SQLite** via `expo-sqlite`. Images stored as files in `documents/images/` via `expo-file-system`; the database holds their relative paths.

### 7.1 Schema

```sql
CREATE TABLE decks (
  id            TEXT PRIMARY KEY,         -- uuid
  name          TEXT NOT NULL,
  emoji         TEXT,                     -- single glyph
  description   TEXT,
  cover_image   TEXT,                     -- relative path or NULL
  shuffle_enabled INTEGER DEFAULT 0,      -- 0 | 1, persists per-deck shuffle preference
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,         -- epoch ms
  updated_at    INTEGER NOT NULL
);

CREATE TABLE cards (
  id            TEXT PRIMARY KEY,
  deck_id       TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  front_text    TEXT NOT NULL DEFAULT '',
  front_images  TEXT NOT NULL DEFAULT '[]',  -- JSON array of relative paths
  back_text     TEXT NOT NULL DEFAULT '',
  back_images   TEXT NOT NULL DEFAULT '[]',  -- JSON array
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE TABLE settings (
  key           TEXT PRIMARY KEY,
  value         TEXT NOT NULL
);
-- Known keys:
--   theme_mode: "system" | "light" | "dark"
```

### 7.2 Forward compatibility — image arrays

`front_images` and `back_images` are JSON arrays from day one. v1 UI writes arrays of length 0 or 1; later versions can store many without a schema migration. If a v2 export with multiple images is imported into v1, only the first image is shown and a small indicator notes additional images exist in newer versions.

### 7.3 Text formatting — supported Markdown subset

- `**bold**`
- `*italic*`
- `- bullet lists`
- `\`\`\`code blocks\`\`\``
- Line breaks via double-newline (paragraph) or trailing two spaces (soft break)

Headings, links, tables, and HTML embeds are not supported in v1.

### 7.4 Image handling

- Picked via `expo-image-picker`
- Downscaled to max 1600 px on the long edge
- Re-encoded to JPEG at quality 0.85
- Saved to `documents/images/<uuid>.jpg`
- Cover images saved to `documents/images/cover_<uuid>.jpg`

---

## 8. Export, Import & Share Format

A `.parchment` file is a UTF-8 JSON document. Same schema is used for full-library exports and single-deck shares.

```json
{
  "format": "parchment.v1",
  "exported_at": 1735000000000,
  "decks": [
    {
      "id": "uuid",
      "name": "Spanish Vocab",
      "emoji": "🌿",
      "description": "Beginner vocabulary",
      "cover_image": "data:image/jpeg;base64,...",
      "cards": [
        {
          "id": "uuid",
          "front_text": "biblioteca",
          "front_images": [],
          "back_text": "library",
          "back_images": ["data:image/jpeg;base64,..."]
        }
      ]
    }
  ]
}
```

Images are inlined as base64 data URIs so the file is fully self-contained and portable across devices.

### Import behavior

- File picked via `expo-document-picker`
- For each deck in the file:
  - If no existing deck has the same `id`: imported as-is
  - If `id` collides: user is prompted with three choices:
    - **Replace existing deck** — delete the existing deck and all its cards (cascade), then insert the imported deck and cards
    - **Keep both (rename new)** — generate a fresh `id` for the imported deck and append " (imported)" to its name
    - **Skip** — leave the existing deck untouched and ignore the import for this deck
- All inlined base64 images — both `cover_image` on decks and `front_images` / `back_images` on cards — are decoded back to files in `documents/images/` and the JSON fields are rewritten to relative paths before insertion

### Share behavior

- "Share deck" action on any deck:
  1. Writes a single-deck `.parchment` file to a temp directory
  2. Calls `expo-sharing` to open the OS share sheet
  3. The user picks the channel (Messages, email, AirDrop, Drive, etc.)

---

## 9. Technical Stack

| Concern | Choice |
|---|---|
| Framework | Expo SDK (latest stable) + React Native |
| Language | TypeScript |
| Navigation | `expo-router` |
| Animations | `react-native-reanimated` v3 + `react-native-gesture-handler` |
| Storage | `expo-sqlite` |
| Files | `expo-file-system` |
| Images | `expo-image-picker` + `expo-image` |
| Sharing | `expo-sharing` + `expo-document-picker` |
| Markdown rendering | `react-native-marked` |
| State management | `zustand` (with SQLite-backed hydration) |
| Testing | Jest for data layer; manual smoke tests for screens |

---

## 10. Project Structure

```
parchment/
├── app/                      # expo-router screens
│   ├── _layout.tsx           # root theme provider, nav stack
│   ├── index.tsx             # Home (Deck Grid)
│   ├── deck/[id]/index.tsx   # Deck Detail
│   ├── deck/[id]/study.tsx   # Study Mode
│   ├── deck/[id]/edit.tsx    # Deck Editor
│   ├── card/[id]/edit.tsx    # Card Editor (also handles new cards)
│   └── settings.tsx
├── src/
│   ├── db/                   # schema.ts, migrations.ts, queries.ts
│   ├── store/                # zustand stores (decks, cards, settings)
│   ├── components/           # CardFace, DeckTile, MarkdownEditor, FlipCard, etc.
│   ├── theme/                # tokens, light + dark palettes, ThemeProvider
│   ├── animations/           # flip, swipe, transition helpers
│   └── lib/                  # export.ts, import.ts, share.ts, image.ts
├── assets/                   # fonts, app icon, splash
├── app.json                  # Expo config (name, icon, splash, scheme)
└── package.json
```

---

## 11. Build & Deploy Path

Builds use **EAS Build** (Expo Application Services), tied to the user's existing Expo account.

1. **Local dev:** `npx expo start` → Expo Go on Android phone for quick iteration during the first feature (before SQLite is wired).
2. **Custom dev client** (required once SQLite and other native modules are added):
   `eas build --profile development --platform android` — produces a one-time installable APK; subsequent code changes hot-reload without rebuilding.
3. **Internal preview build** for sharing with testers: `eas build --profile preview --platform android` → `.apk`.
4. **Production:**
   - `eas build --profile production --platform android` → `.aab` for Google Play
   - `eas build --profile production --platform ios` → `.ipa` for App Store (cloud-built; no Mac required)
   - `eas submit` uploads to the respective stores
5. **Costs:** Google Play one-time $25; Apple Developer $99/year (only needed when shipping to TestFlight or App Store).

---

## 12. Open Questions for Implementation Plan

These are intentionally deferred to the implementation-plan stage rather than over-specified now:

1. Exact icon and splash screen artwork (placeholder OK for v1).
2. Drag-handle interaction details (touch target size, scroll behavior during drag).
3. Specific font files to bundle vs. relying on system serif fallbacks.
4. Exact error UX for malformed imports (toast vs. modal vs. inline).
5. App store listing copy, screenshots, privacy policy text.

---

## 13. Success Criteria for v1

- User can create a deck, add cards with formatted text and an image, and study them with the horizontal flip + swipe interactions.
- Library survives app reinstall via export → import.
- Light and dark themes look polished; system theme switching works without restart.
- 60 fps animations on a mid-range Android phone (e.g., Pixel 6a).
- The app contains zero notifications, badges, streaks, or popups.
- A `.parchment` file shared from one device imports cleanly on another (Android ↔ iOS).
