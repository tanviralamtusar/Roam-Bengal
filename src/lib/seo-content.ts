import { overviewParagraphs, plainText } from "@/lib/content-types";
import type {
  AccessibilityEntry,
  AdviceBlock,
  BlogPostDTO,
  GlanceEntry,
  ItineraryDay,
  TourDTO,
  TourFaq,
} from "@/lib/content-types";

/**
 * The copy a visitor actually reads on a tour or post page, flattened for the admin SEO
 * analyzer. Without this the analyzer had nothing to score but the meta description.
 *
 * Paragraphs are joined by a blank line so the readability checks can still see
 * paragraph and sentence boundaries.
 */
export interface SeoContent {
  /** Every visible block of copy (list items included) for word count and keyphrase density. */
  body: string;
  /** Full-sentence copy only, for the readability checks. Bullet fragments like "Hotel
   *  pickup" would otherwise count as sentences with no transition words. */
  prose: string;
  firstParagraph: string;
  h1: string;
  imageAlts: string[];
}

const clean = (s: string | null | undefined) => (s ? plainText(s) : "");

/** Ends a fragment with a full stop so the sentence splitter does not run it into the next. */
const terminate = (s: string) => (s && !/[.!?:]$/.test(s) ? `${s}.` : s);

const join = (parts: string[]) =>
  parts
    .map((p) => terminate(clean(p)))
    .filter(Boolean)
    .join("\n\n");

export function tourSeoContent(t: TourDTO): SeoContent {
  const hidden = new Set(t.hiddenSections);
  const show = (id: string) => !hidden.has(id);

  const prose: string[] = [];
  const lists: string[] = [];

  if (show("overview")) {
    if (t.summary) prose.push(t.summary);
    prose.push(...overviewParagraphs(t.overview));
    if (t.overviewTip) prose.push(t.overviewTip);
  }
  if (show("highlights")) lists.push(...t.highlights);
  if (show("glance")) {
    for (const g of t.glance as GlanceEntry[]) prose.push(g.detail);
    for (const a of t.addons) lists.push(a.title, a.detail);
  }
  if (show("itinerary")) {
    for (const d of t.itinerary as ItineraryDay[]) {
      lists.push(d.title);
      prose.push(d.detail);
    }
  }
  if (show("included")) lists.push(...t.inclusions, ...t.exclusions);
  if (show("key_notes")) {
    for (const b of t.advice as AdviceBlock[]) lists.push(b.title, ...b.items);
    for (const a of t.accessibility as AccessibilityEntry[]) prose.push(a.detail);
    lists.push(...t.pledge);
  }
  if (show("why_us")) lists.push(...t.whyItems);
  if (show("faq")) {
    for (const f of t.faqs as TourFaq[]) {
      lists.push(f.question);
      prose.push(f.answer);
    }
  }

  const proseText = join(prose);
  return {
    body: [proseText, join(lists)].filter(Boolean).join("\n\n"),
    prose: proseText,
    firstParagraph: clean(t.summary) || clean(overviewParagraphs(t.overview)[0]),
    h1: t.title,
    imageAlts: [t.heroImageAlt ?? "", ...t.images.map((i) => i.alt)].filter(Boolean),
  };
}

export function postSeoContent(p: BlogPostDTO): SeoContent {
  const body = join([p.excerpt ?? "", ...p.body]);
  return {
    body,
    prose: body,
    firstParagraph: clean(p.body[0]) || clean(p.excerpt),
    h1: p.title,
    imageAlts: [p.coverImageAlt ?? ""].filter(Boolean),
  };
}
