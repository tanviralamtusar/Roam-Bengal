import { useSiteSettings } from "@/hooks/use-site-settings";
import { imageMeta } from "@/lib/image-meta";
import { mediaSrcSet } from "@/lib/media-sizes";
import { ButtonLink } from "@/components/ui/button";
import { FormatText } from "@/components/ui/format-text";
import { DhakaScene } from "@/components/art/dhaka-scene";
import { DREAM_BG } from "./palette";
import type { HomeSectionProps } from "./registry";

export function DreamCtaSection(_props: HomeSectionProps) {
  const { homepage } = useSiteSettings();
  const photo = imageMeta(homepage, "cta_image");
  return (
    // Tighter on mobile: a shorter gap above the heading, and the illustration sits
    // straight on the footer with no bottom padding.
    <section
      id="contact"
      className="pt-[40px] nav:pt-[70px] nav:pb-[70px]"
      style={{ background: DREAM_BG }}
    >
      <div className="wrap grid items-center gap-10 nav:grid-cols-2">
        <div>
          <h2 className="mb-[22px] font-kalam text-[clamp(1.9rem,3.4vw,2.5rem)] leading-[1.3] font-bold">
            <span className="text-green">{homepage.cta_heading_1}</span>
            <br />
            About <span className="text-accent">{homepage.cta_heading_2}</span>
          </h2>
          {homepage.cta_paragraphs.map((p) => (
            <p key={p} className="mb-[18px] max-w-[480px] text-[0.95rem] leading-[1.6] text-ink">
              <FormatText>{p}</FormatText>
            </p>
          ))}
          <ButtonLink to={homepage.cta_link} variant="green-dark">
            {homepage.cta_label}
          </ButtonLink>
        </div>
        {/* The drawing is the designed default, not a placeholder, so it stays until a
            photo is actually uploaded. The upload sits directly on the section — no frame,
            fill, or shadow — so a transparent PNG reads the same way the drawing does, and
            the drawing's 460×380 ratio is kept on desktop so swapping does not shift the
            section. On mobile the upload keeps its own ratio, so no letterbox gap shows. */}
        {homepage.cta_image ? (
          <img
            src={homepage.cta_image}
            srcSet={mediaSrcSet(homepage.cta_image)}
            sizes="(min-width: 980px) 50vw, 100vw"
            alt={photo.alt}
            title={photo.title || undefined}
            loading="lazy"
            decoding="async"
            className="w-full object-contain nav:aspect-[46/38]"
          />
        ) : (
          <DhakaScene className="h-auto w-full" />
        )}
      </div>
    </section>
  );
}
