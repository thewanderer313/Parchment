import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";

const DOC_DIR = (FileSystem as unknown as { documentDirectory: string | null }).documentDirectory ?? "";

function safeFilename(name: string): string {
  return name.replace(/[^a-z0-9_-]+/gi, "_").slice(0, 40) || "parchment";
}

export async function writeAndShare(json: string, suggestedName: string): Promise<void> {
  const path = `${DOC_DIR}${safeFilename(suggestedName)}.parchment.json`;
  await FileSystem.writeAsStringAsync(path, json);
  const available = await Sharing.isAvailableAsync();
  if (!available) return;
  await Sharing.shareAsync(path, { mimeType: "application/json" });
}

export async function pickImportFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "*/*"],
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (result.canceled || result.assets.length === 0) return null;
  const uri = result.assets[0].uri;
  const body = await FileSystem.readAsStringAsync(uri);
  return body;
}
