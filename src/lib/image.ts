import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
// SDK 56 moved the string-path file APIs (readAsStringAsync, writeAsStringAsync,
// documentDirectory, copyAsync, etc.) to /legacy. The main entry's re-exports
// from "expo-file-system" are deprecation shims that THROW at runtime — must
// import from "/legacy" for real device behavior.
import * as FileSystem from "expo-file-system/legacy";
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
