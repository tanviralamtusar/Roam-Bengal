import { createFileRoute, notFound } from "@tanstack/react-router";
import { PolicyLayout } from "@/components/policy-layout";
import { infoDefaults, type InfoSlug } from "@/content/policy-defaults";
import { useSettingGroup } from "@/hooks/use-site-settings";
import { toPlainText } from "@/lib/markdown";
import {
  getPageSetting,
  listPublishedFaqs,
  listPublishedTestimonials,
} from "@/lib/site-content.functions";
import { faqPreviewChannel } from "@/lib/faq-preview";

/**
 * Standalone info pages the footer links to: /visa-information, /embassy-directory,
 * /travel-faqs, /responsible-travel, /guides, /careers, /rentals-tickets,
 * /customer-support, /licensed-tour-operator, /secure-payment-gateway,
 * /destinations, /b2b-partners, /photo-gallery, /privacy-policy, /terms-conditions.
 *
 * This is a catch-all at the root, so it must be the last thing that matches — any
 * unknown path falls through to notFound().
 */
export const Route = createFileRoute("/$infoSlug")({
  loader: async ({ params }) => {
    // Imported here rather than at the top: the loader and `head` are not code-split, so a
    // static import put every info page's default copy into the JS every page downloads.
    // The component's own static import is fine — it lives in this route's chunk.
    const { INFO_SLUGS, infoDefaults } = await import("@/content/policy-defaults");
    const slug = params.infoSlug as InfoSlug;
    if (!INFO_SLUGS.includes(slug)) throw notFound();
    // /travel-faqs is the one info page with real data behind it; every info page
    // shows the shared reviews strip above the footer.
    const [faqs, testimonials, stored] = await Promise.all([
      slug === "travel-faqs" ? listPublishedFaqs() : Promise.resolve([]),
      listPublishedTestimonials(),
      getPageSetting({ data: { key: `info_${slug}` } }),
    ]);
    const { title, subhead } = infoDefaults[slug];
    return { slug, faqs, testimonials, stored, title, subhead };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    return {
      meta: [
        { title: `${loaderData.title} — Roam Bengal` },
        { name: "description", content: toPlainText(loaderData.subhead) },
      ],
    };
  },
  component: InfoRoute,
});

function InfoRoute() {
  const { slug, faqs: saved, testimonials, stored } = Route.useLoaderData();

  const page = useSettingGroup(`info_${slug}`, infoDefaults[slug], stored);

  // Same splice the reviews page uses: an unsaved FAQ from the admin editor replaces the saved
  // row with its id, or is prepended when it has none yet. No `?preview=1` gate needed — there is
  // no per-FAQ detail route to 404 on, so being in an iframe at all is signal enough.
  const draft = faqPreviewChannel.useDraft(true);
  const faqs = draft ? [draft, ...saved.filter((f) => f.id !== draft.id)] : saved;

  // The FAQ page builds its blocks from the `faqs` table rather than static copy. Any rich-text
  // `body` is kept — `PolicyLayout` shows it as an intro above the questions on this page.
  const withFaqs =
    slug === "travel-faqs" && faqs.length
      ? {
          ...page,
          blocks: faqs.map((f) => ({
            heading: f.question,
            paragraphs: [f.answer],
          })),
        }
      : page;

  return (
    <PolicyLayout
      page={withFaqs}
      faqPage={slug === "travel-faqs"}
      testimonials={testimonials}
    />
  );
}
