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

export function buildImagePath(prefix?: string, ext: string = "jpg"): string {
  const tag = prefix ? `${prefix}_` : "";
  return `${IMAGE_DIR}${tag}${newUuid()}.${ext}`;
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
    // SDK 56 deprecated MediaTypeOptions.Images in favor of the array form.
    mediaTypes: ["images"],
    allowsMultipleSelection: false,
    quality: 1,
  });
  if (picked.canceled || picked.assets.length === 0) return null;
  const source = picked.assets[0];

  // Animated GIFs would be collapsed to a single still frame by
  // expo-image-manipulator. Detect by MIME (preferred) or by file
  // extension as a fallback when the picker doesn't surface a mime
  // type. For GIFs, copy the source straight through with a .gif
  // extension so the animation is preserved end to end.
  const isGif =
    source.mimeType === "image/gif" || source.uri.toLowerCase().endsWith(".gif");

  await ensureImageDir();

  if (isGif) {
    const destPath = buildImagePath(prefix, "gif");
    await FileSystem.copyAsync({ from: source.uri, to: destPath });
    return { path: destPath };
  }

  const manipulated = await ImageManipulator.manipulateAsync(
    source.uri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  );
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
