export const SCHEMA_V1 = `
  CREATE TABLE decks (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    emoji           TEXT,
    description     TEXT,
    cover_image     TEXT,
    shuffle_enabled INTEGER NOT NULL DEFAULT 0,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
  );

  CREATE TABLE cards (
    id            TEXT PRIMARY KEY,
    deck_id       TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    front_text    TEXT NOT NULL DEFAULT '',
    front_images  TEXT NOT NULL DEFAULT '[]',
    back_text     TEXT NOT NULL DEFAULT '',
    back_images   TEXT NOT NULL DEFAULT '[]',
    sort_order    INTEGER NOT NULL DEFAULT 0,
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards(deck_id);
  CREATE INDEX IF NOT EXISTS idx_cards_deck_sort ON cards(deck_id, sort_order);

  CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;
