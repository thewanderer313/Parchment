// /legacy entry — see src/lib/export.ts for the SDK 56 deprecation note.
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";

const DOC_DIR = FileSystem.documentDirectory ?? "";

function safeFilename(name: string): string {
  return name.replace(/[^a-z0-9_-]+/gi, "_").slice(0, 40) || "parchment";
}

export async function writeAndShare(json: string, suggestedName: string): Promise<void> {
  // Use a plain ".json" extension. Some messaging apps strip multi-dot
  // extensions like ".parchment.json" or refuse to attach files whose MIME
  // type can't be inferred from the trailing extension alone. Keep the
  // "parchment-" prefix in the filename so it's still discoverable.
  const path = `${DOC_DIR}${safeFilename(suggestedName)}.json`;
  await FileSystem.writeAsStringAsync(path, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const available = await Sharing.isAvailableAsync();
  if (!available) return;
  await Sharing.shareAsync(path, {
    mimeType: "application/json",
    dialogTitle: "Share Parchment deck",
    UTI: "public.json",
  });
}

export async function pickImportFile(): Promise<string | null> {
  // Accept any file type — we validate by checking the `format` field on
  // parse. This survives messaging apps that strip / replace MIME hints.
  const result = await DocumentPicker.getDocumentAsync({
    type: "*/*",
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (result.canceled || result.assets.length === 0) return null;
  const uri = result.assets[0].uri;

  // Explicit UTF-8 to avoid Android falling back to a binary read when the
  // content URI doesn't advertise its encoding.
  try {
    return await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch (e: unknown) {
    const underlying = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Couldn't read the picked file (${uri}). ` +
      `If you received this via a messaging app, try sharing it to a file-storage app first ` +
      `(Drive, Files, etc.) and import from there. ` +
      `Underlying error: ${underlying}`
    );
  }
}
