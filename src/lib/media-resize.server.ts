import { MEDIA_WIDTHS } from "@/lib/media-sizes";

/**
 * Resizing for `/media/<id>?w=<width>`. See lib/media-sizes.ts for why it exists.
 *
 * sharp is a native, *optional* dependency, loaded on first use. If its binary didn't
 * install on the host, every request quietly gets the original image — exactly what
 * `/media` served before resizing existed — instead of the server failing to start.
 */

type Sharp = (typeof import("sharp"))["default"];

export interface StoredMedia {
  content_type: string;
  bytes: Buffer;
}

export interface MediaFile {
  bytes: Uint8Array<ArrayBuffer>;
  contentType: string;
  /** False when this is a fallback (sharp missing or failed) that a later request could
   *  improve on, so it must not be cached as the permanent answer for this width. */
  final: boolean;
}

/** Animated GIFs would lose their animation, and they are rare enough to leave alone. */
const RESIZABLE = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export function parseMediaWidth(raw: string | null): number | null {
  if (raw === null) return null;
  const width = Number(raw);
  return (MEDIA_WIDTHS as readonly number[]).includes(width) ? width : null;
}

let sharpModule: Promise<Sharp | null> | undefined;

function loadSharp(): Promise<Sharp | null> {
  return (sharpModule ??= import("sharp")
    .then((mod) => {
      const sharp = mod.default;
      // Finished files are cached below; libvips' own operation cache would only add memory.
      sharp.cache(false);
      return sharp;
    })
    .catch((error: unknown) => {
      console.warn("[media] sharp unavailable; serving original images:", error);
      return null;
    }));
}

/**
 * Finished files by `id:width`, least recently used evicted first once over budget. The
 * CDN in front caches these URLs too; this covers its misses and the first requests after
 * a deploy, so each size is encoded about once per process rather than once per visitor.
 */
const CACHE_BUDGET_BYTES = 48 * 1024 * 1024;
const cache = new Map<string, MediaFile>();
let cachedBytes = 0;

function remember(key: string, file: MediaFile) {
  cache.set(key, file);
  cachedBytes += file.bytes.byteLength;
  for (const [oldKey, old] of cache) {
    if (cachedBytes <= CACHE_BUDGET_BYTES) break;
    cache.delete(oldKey);
    cachedBytes -= old.bytes.byteLength;
  }
}

/** Concurrent requests for the same size share one encode. */
const inflight = new Map<string, Promise<MediaFile | null>>();

/**
 * The image `id` at `width`, as WebP, or the original when that is smaller or can't be
 * resized. `load` reads the stored original; it is only called on a cache miss. Null when
 * there is no such image.
 */
export function resizedMedia(
  id: string,
  width: number,
  load: () => Promise<StoredMedia | null>,
): Promise<MediaFile | null> {
  const key = `${id}:${width}`;
  const hit = cache.get(key);
  if (hit) {
    // Re-insert so the Map's order stays least-recently-used first.
    cache.delete(key);
    cache.set(key, hit);
    return Promise.resolve(hit);
  }

  let pending = inflight.get(key);
  if (!pending) {
    pending = encode(width, load)
      .then((file) => {
        if (file?.final) remember(key, file);
        return file;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, pending);
  }
  return pending;
}

async function encode(width: number, load: () => Promise<StoredMedia | null>): Promise<MediaFile | null> {
  const stored = await load();
  if (!stored) return null;
  const original: MediaFile = {
    bytes: new Uint8Array(stored.bytes),
    contentType: stored.content_type,
    final: true,
  };
  if (!RESIZABLE.has(stored.content_type)) return original;

  const sharp = await loadSharp();
  if (!sharp) return { ...original, final: false };

  try {
    const output = await sharp(stored.bytes, { failOn: "none" })
      // Re-encoding drops EXIF, so apply its orientation first, as the browser would.
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    // An already well-compressed upload narrower than `width` can come out larger.
    return output.byteLength < stored.bytes.byteLength
      ? { bytes: new Uint8Array(output), contentType: "image/webp", final: true }
      : original;
  } catch (error) {
    console.error("[media] resize failed; serving the original:", error);
    return { ...original, final: false };
  }
}
