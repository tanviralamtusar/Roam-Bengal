import { createFileRoute, notFound } from "@tanstack/react-router";
import { PolicyLayout } from "@/components/policy-layout";
import { policyDefaults, type PolicySlug } from "@/content/policy-defaults";
import { useSettingGroup, useSiteSettings } from "@/hooks/use-site-settings";
import { toPlainText } from "@/lib/markdown";
import { getPageSetting, listPublishedTestimonials } from "@/lib/site-content.functions";

export const Route = createFileRoute("/policies/$slug")({
  loader: async ({ params }) => {
    // Imported here, not at the top: see the same note in $infoSlug.tsx.
    const { POLICY_SLUGS, policyDefaults } = await import("@/content/policy-defaults");
    const slug = params.slug as PolicySlug;
    if (!POLICY_SLUGS.includes(slug)) throw notFound();
    const [testimonials, stored] = await Promise.all([
      listPublishedTestimonials(),
      getPageSetting({ data: { key: `policy_${slug}` } }),
    ]);
    const { title, subhead } = policyDefaults[slug];
    return { slug, testimonials, stored, title, subhead };
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
  component: PolicyRoute,
});

function PolicyRoute() {
  const { slug, testimonials, stored } = Route.useLoaderData();
  // Touch the settings hook so the header/footer share one source of truth.
  useSiteSettings();

  // Stored JSON merges field-by-field over the shipped copy, so a partial edit in the
  // admin panel can never blank out a section it did not touch. Going through
  // `useSettingGroup` also applies the admin editor's unsaved draft, which is what makes
  // the live preview update as you type.
  const page = useSettingGroup(`policy_${slug}`, policyDefaults[slug], stored);

  return <PolicyLayout page={page} testimonials={testimonials} />;
}
