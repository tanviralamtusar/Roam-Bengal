import { createFileRoute } from "@tanstack/react-router";
import { queryOne } from "@/integrations/mysql/client.server";
import { parseMediaWidth, resizedMedia, type StoredMedia } from "@/lib/media-resize.server";

const IMMUTABLE = "public, max-age=31536000, immutable";
/** A fallback original served for a resized URL; the real resized file may be available later. */
const RETRY_LATER = "public, max-age=3600";

export const Route = createFileRoute("/media/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const load = () =>
          queryOne<StoredMedia>("SELECT content_type, bytes FROM media WHERE id = ? LIMIT 1", [
            params.id,
          ]);

        // `?w=` is one of MEDIA_WIDTHS (lib/media-sizes.ts); anything else gets the original.
        const width = parseMediaWidth(new URL(request.url).searchParams.get("w"));
        if (width) {
          const file = await resizedMedia(params.id, width, load);
          if (!file) return new Response("Not found", { status: 404 });
          return new Response(file.bytes, {
            headers: {
              "Content-Type": file.contentType,
              "Cache-Control": file.final ? IMMUTABLE : RETRY_LATER,
            },
          });
        }

        const media = await load();
        if (!media) return new Response("Not found", { status: 404 });
        return new Response(new Uint8Array(media.bytes), {
          headers: { "Content-Type": media.content_type, "Cache-Control": IMMUTABLE },
        });
      },
    },
  },
});
