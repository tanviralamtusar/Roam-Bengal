import { useSiteSettings } from "@/hooks/use-site-settings";
import { TourCard } from "@/components/tour-card";
import { SectionHead } from "@/components/sections";
import { ButtonLink } from "@/components/ui/button";
import toursBg from "@/assets/popular-tours-bg-1920.webp";
import toursBgSmall from "@/assets/popular-tours-bg-960.webp";
import { SECTION_SEAM, TOUR_FRAMES } from "./palette";
import type { HomeSectionProps } from "./registry";

export function PopularToursSection({ tours }: HomeSectionProps) {
  const { homepage } = useSiteSettings();
  // Featured day tours first, topped up with other day tours to fill six slots.
  const featuredTours = tours
    .filter((tour) => tour.category === "day-tour")
    .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured))
    .slice(0, 6);

  return (
    <section id="packages" className="shell relative overflow-hidden pt-20 pb-[60px] text-center">
      {/* Keep the homepage background fixed to the photo used in the design.
          The CMS field is intentionally not used here so it cannot rotate or
          replace this image after the page has loaded.

          An <img>, not a CSS background: a background image is fetched as soon as the
          style applies, so it competed with the hero photo for bandwidth on first load.
          This one waits until the band nears the viewport.

          Below 980px the band is several screens tall, so the photo is blown up many
          times over and sits under a 60% black scrim either way: phones get the small
          file however dense their screen (both files are also encoded at low quality,
          for the same reason). */}
      <img
        src={toursBg}
        srcSet={`${toursBgSmall} 960w, ${toursBg} 1920w`}
        sizes="(min-width: 980px) 100vw, 240px"
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div aria-hidden className="absolute inset-0 bg-black/60" />

      {/* Seams into the neighbouring bands — the cream feature strip above, the white
          gallery below — where the torn paper edges used to be. */}
      <div
        aria-hidden
        className="home-section-seam pointer-events-none absolute inset-x-0 top-0 z-[5] h-[6px]"
        style={{ background: SECTION_SEAM }}
      />
      <div
        aria-hidden
        className="home-section-seam pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[6px]"
        style={{ background: SECTION_SEAM }}
      />

      <div className="relative z-10">
        <SectionHead kicker={homepage.popular_kicker} className="[&>h2]:text-white">
          {homepage.popular_heading}
        </SectionHead>

        <div className="wide grid gap-[26px] text-left md:grid-cols-2 nav:grid-cols-3">
          {featuredTours.map((tour, i) => (
            <TourCard key={tour.id} tour={tour} gradientCss={TOUR_FRAMES[i % 3]} />
          ))}
        </div>

        <div className="mt-11 mb-[90px]">
          <ButtonLink to="/tours" variant="outline-light">
            View All Tours →
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
