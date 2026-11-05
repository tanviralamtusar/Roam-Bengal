import { createFileRoute } from "@tanstack/react-router";
import { listSitemapEntries, type SitemapEntries } from "@/lib/seo.functions";
import { SITE_URL } from "@/lib/seo-head";
import { STATIC_LINK_TARGETS } from "@/lib/link-targets";

/**
 * `<lastmod>` must be W3C Datetime. The MySQL pool runs with `dateStrings: true`, so
 * `updated_at` arrives as `"2026-10-14 01:50:31.251"` — a DATETIME with no zone, which
 * Google rejects. The server's time zone is UTC (CURRENT_TIMESTAMP defaults), so read
 * it as UTC. Anything unparseable is dropped rather than emitted as an invalid date.
 */
function toW3cDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value) ? `${value.replace(" ", "T")}Z` : value;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        // A DB hiccup should still yield a valid sitemap of the static pages, not a 500 —
        // a failed fetch is what Search Console reports as "Couldn't fetch".
        let dyn: SitemapEntries = { tours: [], posts: [] };
        try {
          dyn = await listSitemapEntries();
        } catch (err) {
          console.error("[sitemap] failed to load tours/posts", err);
        }

        const urls: Array<{ loc: string; lastmod: string | null; priority: string }> = [];

        // Static pages carry no lastmod: stamping them with "now" on every request is
        // false, and Google stops trusting lastmod site-wide when it's unreliable.
        for (const page of STATIC_LINK_TARGETS) {
          urls.push({
            loc: `${SITE_URL}${page.path}`,
            lastmod: null,
            priority: page.path === "/" ? "1.0" : "0.7",
          });
        }
        for (const t of dyn.tours) {
          urls.push({
            loc: `${SITE_URL}/tours/${encodeURIComponent(t.slug)}`,
            lastmod: toW3cDate(t.updated_at),
            priority: "0.8",
          });
        }
        for (const p of dyn.posts) {
          urls.push({
            loc: `${SITE_URL}/blog/${encodeURIComponent(p.slug)}`,
            lastmod: toW3cDate(p.updated_at),
            priority: "0.6",
          });
        }

        const body =
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          urls
            .map(
              (u) =>
                `  <url><loc>${escapeXml(u.loc)}</loc>` +
                (u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : "") +
                `<priority>${u.priority}</priority></url>`,
            )
            .join("\n") +
          `\n</urlset>\n`;

        return new Response(body, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
