import { readFile } from "node:fs/promises";
import path from "node:path";

const EXT_TO_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
};

function guessMimeTypeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return EXT_TO_MIME[ext] ?? "image/png";
}

export async function imagePathToDataUrl(filePath: string): Promise<string> {
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const buf = await readFile(abs);
  const mime = guessMimeTypeFromPath(abs);
  const b64 = buf.toString("base64");
  return `data:${mime};base64,${b64}`;
}

export function normalizeBase64ToDataUrl(imageBase64OrDataUrl: string): string {
  const trimmed = imageBase64OrDataUrl.trim();
  if (trimmed.startsWith("data:")) return trimmed;
  // Best-effort default; callers can pass a full data URL to be explicit.
  return `data:image/png;base64,${trimmed}`;
}
