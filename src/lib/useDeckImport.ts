import { useState } from "react";
import { Alert } from "react-native";
import {
  parseAndPlanImport,
  applyImport,
  type ResolveDecision,
  type ImportPlanEntry,
} from "@/lib/import";
import { pickImportFile } from "@/lib/share";
import { useDecksStore } from "@/store/decksStore";
import { useCardsStore } from "@/store/cardsStore";

/**
 * Sequentially asks the user how to resolve each collision (Skip / Keep
 * both / Replace) using Alert dialogs. Resolves to a decision map keyed
 * by the imported deck's id.
 */
function resolveCollisions(
  entries: ImportPlanEntry[]
): Promise<Record<string, ResolveDecision>> {
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
}

/**
 * Shared core for both file and text imports. Parses the body, walks the
 * collision flow, applies the plan, and reloads the stores so the Home
 * grid / counts reflect the new state. Surfaces a "Import complete"
 * alert at the end.
 */
async function runImport(body: string): Promise<void> {
  const plan = parseAndPlanImport(body, useDecksStore.getState().decks);
  const decisions = await resolveCollisions(plan.entries);
  await applyImport(plan.entries, decisions);
  await useDecksStore.getState().load();
  await useCardsStore.getState().loadCounts();
  const imported = plan.entries.filter((e) => decisions[e.deck.id] !== "skip").length;
  Alert.alert("Import complete", `Imported ${imported} deck(s).`);
}

/**
 * Two import flows for callers — file picker (subject to URI/permission
 * quirks on Android) and free-form text (paste from anywhere). Both
 * surface errors via Alert and toggle a single `busy` flag.
 *
 * importFromText returns true on success so the caller can dismiss its
 * paste modal.
 */
export function useDeckImport() {
  const [busy, setBusy] = useState(false);

  const importFromFile = async () => {
    setBusy(true);
    try {
      const body = await pickImportFile();
      if (!body) return;
      await runImport(body);
    } catch (e: unknown) {
      Alert.alert("Couldn't import", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const importFromText = async (text: string): Promise<boolean> => {
    if (text.trim().length === 0) {
      Alert.alert("Nothing to import", "Paste the contents of a .json export file first.");
      return false;
    }
    setBusy(true);
    try {
      await runImport(text);
      return true;
    } catch (e: unknown) {
      Alert.alert("Couldn't import", e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { busy, importFromFile, importFromText };
}
