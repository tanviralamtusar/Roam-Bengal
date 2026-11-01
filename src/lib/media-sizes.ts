/**
 * Uploaded images (`/media/<id>`) are stored exactly as uploaded — a 2000px logo shown
 * 60px tall, a 1500px photo on a 370px card. `/media/<id>?w=<width>` serves a resized
 * WebP instead (see routes/media.$id.ts), and `mediaSrcSet` builds the `srcset` that
 * lets the browser pick the smallest one that is still sharp.
 *
 * The route only resizes to these widths, so a crawler can't fill its cache with one-off
 * sizes.
 */
export const MEDIA_WIDTHS = [160, 320, 480, 640, 828, 1080, 1280, 1600, 2048] as const;

/** WebP quality for resized uploads. */
export const MEDIA_QUALITY = 72;

/**
 * Resized files are served `immutable`, so the CDN and browsers keep whatever they first
 * got for a URL. Bump this whenever the encoding changes (MEDIA_QUALITY, the resize
 * options in media-resize.server.ts) so the new output gets new URLs; the server ignores it.
 */
const MEDIA_ENCODING_VERSION = 2;

const UPLOADED_MEDIA = /^\/media\/[0-9a-f-]{36}$/i;

/** `srcset` for an uploaded image; undefined for anything else (bundled assets, external
 *  URLs), which are left exactly as they are. */
export function mediaSrcSet(src: string | null | undefined): string | undefined {
  if (!src || !UPLOADED_MEDIA.test(src)) return undefined;
  return MEDIA_WIDTHS.map(
    (width) => `${src}?w=${width}&v=${MEDIA_ENCODING_VERSION} ${width}w`,
  ).join(", ");
}
