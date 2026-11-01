import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { PhotoFrame } from "@/components/ui/photo-frame";
import { imageMeta } from "@/lib/image-meta";
import { FormatText } from "@/components/ui/format-text";
import { WhyIcon } from "@/components/art/icons";
import { STORY_BG } from "./palette";
import type { HomeSectionProps } from "./registry";

/** Below the `nav` breakpoint the rest of the list waits behind "See more". */
const MOBILE_VISIBLE_ITEMS = 2;

export function WhyChooseUsSection(_props: HomeSectionProps) {
  const { homepage } = useSiteSettings();
  const photo = imageMeta(homepage, "why_image");
  const [expanded, setExpanded] = useState(false);
  const hasMore = homepage.why_items.length > MOBILE_VISIBLE_ITEMS;
  return (
    <section id="section-why-choose-us" className="py-[90px]" style={{ background: STORY_BG }}>
      <div className="wrap grid items-center gap-10 nav:grid-cols-2 nav:gap-[60px]">
        <div>
          <h2 className="mb-[18px] font-kalam text-[clamp(2rem,3.6vw,2.7rem)] leading-[1.15] font-bold text-green">
            {homepage.why_heading_1}
            <br />
            <span className="text-accent">{homepage.why_heading_2}</span>
          </h2>
          <p className="mb-[30px] max-w-[480px] text-[0.95rem] text-muted">
            <FormatText>{homepage.why_intro}</FormatText>
          </p>
          <div id="why-items" className="flex flex-col gap-[26px]">
            {homepage.why_items.map((item, i) => (
              <div
                key={item.title}
                className={`items-start gap-[18px] ${
                  !expanded && i >= MOBILE_VISIBLE_ITEMS ? "hidden nav:flex" : "flex"
                }`}
              >
                <WhyIcon name={item.icon} />
                <div>
                  <h3 className="mb-1 font-kalam text-[1.1rem] font-bold text-ink">{item.title}</h3>
                  <p className="max-w-[420px] text-[0.86rem] text-muted">
                    <FormatText>{item.text}</FormatText>
                  </p>
                </div>
              </div>
            ))}
          </div>
          {hasMore ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-controls="why-items"
              className="mt-[22px] inline-flex items-center gap-1 text-[0.9rem] font-semibold text-accent hover:underline nav:hidden"
            >
              {expanded ? "See less" : "See more"}
              <ChevronDown
                className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
          ) : null}
        </div>

        <PhotoFrame
          src={homepage.why_image}
          alt={photo.alt || "Traveller hiking a forest trail in Bangladesh"}
          title={photo.title}
          gradientCss="linear-gradient(150deg,#22B57A,#F2B705 60%,#C4390E)"
          placeholderLabel="images/why-choose-us.jpg"
          // Keep the desktop image visually balanced with the feature list instead of
          // stretching to its full height.
          className="order-first aspect-[4/4.6] w-full rounded-[20px] shadow-[0_20px_46px_rgba(0,0,0,0.16)] nav:order-none nav:aspect-auto nav:h-[640px]"
        />
      </div>
    </section>
  );
}
