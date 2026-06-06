// In-memory store for one-off navigation intents that can't reliably
// be threaded through the URL.
//
// Specifically: passing `startCardId` to the study session as a URL
// query parameter looked correct in code but kept getting stripped
// somewhere in expo-router's typedRoutes dispatch — the receiving
// Study screen's useLocalSearchParams never saw the value, so
// "Study from this card" always landed on card 0. Two URL formats
// (params object + raw query string with encodeURIComponent) both
// hit the same issue.
//
// This store sidesteps the URL entirely. The deck detail card menu
// writes the intent here just before calling router.push; the Study
// screen reads it on mount; whoever reads it clears it so a stale
// intent can't leak into a future session.

import { create } from "zustand";

interface NavIntentState {
  /** Deck-id-keyed: the card the next Study session for that deck
   *  should start on. One slot per deck so two parallel intents
   *  (unlikely but possible during rapid navigation) don't clobber
   *  each other. */
  studyStartCardId: Record<string, string>;
  setStudyStart: (deckId: string, cardId: string) => void;
  consumeStudyStart: (deckId: string) => string | undefined;
}

export const useNavIntentStore = create<NavIntentState>((set, get) => ({
  studyStartCardId: {},
  setStudyStart: (deckId, cardId) =>
    set((s) => ({
      studyStartCardId: { ...s.studyStartCardId, [deckId]: cardId },
    })),
  consumeStudyStart: (deckId) => {
    const current = get().studyStartCardId[deckId];
    if (current === undefined) return undefined;
    set((s) => {
      const next = { ...s.studyStartCardId };
      delete next[deckId];
      return { studyStartCardId: next };
    });
    return current;
  },
}));
