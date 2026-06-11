# Parchment

<p align="center">
  <img src="assets/images/splashscreen.png" alt="Parchment splash screen" width="320">
</p>

A calm, account-free flashcard app for iOS and Android. Open it, swipe through cards, learn. No accounts, no notifications, no streaks. Nothing nags.

Parchment is local-first: your decks live on your device, and you own the file. Share a single deck or your whole library as a self-contained `.parchment` file via Messages, email, AirDrop, Drive, or anything else the OS share sheet supports.

## Highlights

- **Forest on Parchment aesthetic** — warm parchment backgrounds, rich forest-green accents, a serif body face, and a companion dark palette for late-night study.
- **Markdown cards with live preview** — split-screen editor with a format toolbar so users who don't know Markdown can still write formatted text.
- **Optional image per side** — downscaled and re-encoded locally; cover images for decks too.
- **Quiet study mode** — tap to flip with a 380 ms 3D rotation; swipe between cards with a low-tension spring. No timer, no streak, no scoring.
- **Per-deck shuffle** — preference persists per deck.
- **Backup, restore, share** — export your whole library or share a single deck as a `.parchment` file (UTF-8 JSON with inlined base64 images). Recipient taps the file → Parchment opens → "Import this deck?".
- **Reduce Motion aware** — flips collapse to cross-fades and screen transitions become near-instant when the OS setting is on.
- **No haptics, no notifications, no sounds. Ever.**

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Expo SDK 56 + React Native 0.85 |
| Language | TypeScript |
| Navigation | `expo-router` (file-based, typed routes) |
| Animations | `react-native-reanimated` v4 + `react-native-gesture-handler` |
| Storage | `expo-sqlite` |
| Files & images | `expo-file-system`, `expo-image-picker`, `expo-image` |
| Sharing | `expo-sharing` + `expo-document-picker` |
| Markdown | `react-native-marked` |
| State | `zustand` (SQLite-backed hydration) |
| Testing | Jest + `@testing-library/react-native` |

## Getting started

```bash
npm install
npx expo start
```

Open the dev menu in Expo Go (or a custom dev client) to launch on iOS or Android.

A custom dev client is required because Parchment uses native modules (SQLite, sharing, image picker). The first install needs a one-time build:

```bash
eas build --profile development --platform android   # or --platform ios
```

Subsequent code changes hot-reload over the dev client without rebuilding.

## Scripts

```bash
npm run start      # expo start
npm run android    # expo start --android
npm run ios        # expo start --ios
npm run web        # expo start --web
npm run lint       # expo lint
npm test           # jest
npm run test:watch # jest --watch
```

## Building releases

Parchment ships through [EAS Build](https://docs.expo.dev/eas/).

```bash
eas build --profile preview    --platform android   # .apk for testers
eas build --profile production --platform android   # .aab for Google Play
eas build --profile production --platform ios       # .ipa for App Store
eas submit                                          # upload to the store
```

## Project structure

```
parchment/
├── src/
│   ├── app/                  # expo-router screens (tabs, deck, card editor, study, settings)
│   ├── db/                   # schema, migrations, queries (expo-sqlite)
│   ├── store/                # zustand stores (decks, cards, settings)
│   ├── components/           # CardFace, DeckTile, MarkdownEditor, FlipCard, …
│   ├── theme/                # tokens, light + dark palettes, ThemeProvider
│   ├── animations/           # flip, swipe, transition helpers
│   └── lib/                  # export, import, share, image utilities
├── assets/                   # fonts, app icon, splash
├── docs/                     # design spec and implementation plans
├── app.json                  # Expo config
└── package.json
```

## Data model

Decks and cards live in SQLite; images live as JPEGs in `documents/images/` and the DB stores their relative paths. `front_images` and `back_images` are JSON arrays from day one so future versions can carry multiple images without a schema migration.

See [`docs/superpowers/specs/2026-06-02-parchment-flashcard-app-design.md`](docs/superpowers/specs/2026-06-02-parchment-flashcard-app-design.md) for the full design spec — palettes, motion timings, schema, and the `.parchment` file format.

## License

MIT.
