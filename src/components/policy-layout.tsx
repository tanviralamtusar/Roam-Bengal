import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppFloat } from "@/components/whatsapp-float";
import { ButtonLink } from "@/components/ui/button";
import { FaqAccordion } from "@/components/ui/faq-accordion";
import { FormatDocument, FormatText } from "@/components/ui/format-text";
import { BannerPhoto } from "@/components/ui/banner-photo";
import { imageMeta } from "@/lib/image-meta";
import { PolicyGallery, PolicyReviews } from "@/components/policy-extras";
import type { PolicyPage } from "@/content/policy-defaults";
import type { TestimonialDTO } from "@/lib/content-types";

/** Shared by /policies/:slug and the standalone info pages. */
export function PolicyLayout({
  page,
  faqPage = false,
  testimonials = [],
}: {
  page: PolicyPage;
  faqPage?: boolean;
  testimonials?: TestimonialDTO[];
}) {
  return (
    <>
      <div className="full-bleed relative isolate bg-green-dark">
        <BannerPhoto
          src={page.banner_image}
          alt={imageMeta(page, "banner_image").alt || page.title}
          title={imageMeta(page, "banner_image").title}
        />
        <SiteHeader />
        <div className="relative z-[1] wrap py-14 text-center">
          <span className="text-[0.72rem] font-semibold tracking-[0.2em] text-gold uppercase">
            {page.eyebrow}
          </span>
          <h1 className="mt-3 font-display text-[clamp(1.9rem,4.4vw,2.9rem)] leading-tight text-white">
            {page.title}
          </h1>
          <nav className="mt-4 text-[0.78rem] text-white/60" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-gold">
              Home
            </Link>
            {" / "}
            <span className="text-white/85">{page.title}</span>
          </nav>
        </div>
      </div>

      <main id="main" className="wrap py-14">
        {/* A <div>, not a <p>: saved subheads can hold their own headings and paragraphs,
            which a <p> may not contain. The browser closes the <p> early, the page no longer
            matches what React rendered, and React throws the server HTML away and rebuilds
            the whole page in the browser. The `sm:` classes keep the justified alignment
            the base `p` style gives text from 640px up. */}
        <div className="font-display text-[1.2rem] leading-8 text-green-dark sm:text-justify sm:[text-justify:inter-word]">
          <FormatText>{page.subhead}</FormatText>
        </div>

        {/* `body` is what the admin editor writes now; `blocks` is the shape these pages shipped
            in and is still what the code defaults carry, so both have to render. */}
        {page.body?.trim() ? (
          // `blog-body` is the shared typography for admin-authored rich text, not blog-only —
          // it already covers every tag the editor emits, so a second near-identical block of
          // CSS would just be another thing to keep in sync.
          <div className="blog-body mt-10">
            <FormatDocument>{page.body}</FormatDocument>
          </div>
        ) : null}
        {/* On the FAQ page the questions come from the `faqs` table, so they show alongside
            the body; elsewhere `body` replaces the legacy `blocks`. */}
        {page.body?.trim() && !faqPage ? null : (
        <div className="mt-10 flex flex-col gap-10">
          {faqPage ? (
            <FaqAccordion
              items={page.blocks.map((block) => ({
                question: block.heading,
                answer: block.paragraphs?.join("\n\n") ?? block.items?.join("\n\n") ?? "",
              }))}
            />
          ) : (
            page.blocks.map((block) => (
              <section key={block.heading}>
                <h2 className="font-display text-[1.25rem] text-green">{block.heading}</h2>
                {block.paragraphs?.map((p) => (
                  <p key={p} className="mt-3 text-[0.94rem] leading-8 text-ink/85">
                    <FormatText>{p}</FormatText>
                  </p>
                ))}
                {block.items?.length ? (
                  <ul className="mt-3 flex flex-col gap-2.5">
                    {block.items.map((item) => (
                      <li
                        key={item}
                        className="flex gap-3 text-[0.92rem] leading-7 text-ink/85"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                        <span>
                          <FormatText>{item}</FormatText>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))
          )}

          {page.blocks.length === 0 && !page.body?.trim() ? (
            <p className="rounded-xl border border-dashed border-rule p-8 text-center text-[0.92rem] text-muted">
              This page is being written. Message us in the meantime — we will answer
              directly.
            </p>
          ) : null}
        </div>
        )}

        <div className="mt-12 rounded-2xl bg-mint p-7 text-center">
          <h3 className="font-display text-[1.2rem] text-green">{page.contact_heading}</h3>
          {/* A <div> for the same reason as the subhead above. */}
          <div className="mx-auto mt-2 max-w-md text-center text-[0.9rem] leading-7 text-muted">
            <FormatText>{page.contact_body}</FormatText>
          </div>
          <div className="mt-5">
            <ButtonLink to="/contact" variant="green-dark">
              Contact Us →
            </ButtonLink>
          </div>
        </div>
      </main>

      <PolicyGallery />
      <PolicyReviews testimonials={testimonials} />

      <SiteFooter />
      <WhatsAppFloat />
    </>
  );
}
