import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { isExternal, normalizePath } from "@/components/ui/button";
import { FormatText } from "@/components/ui/format-text";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { imageMeta } from "@/lib/image-meta";
import { Mail, MapPin, Phone, type LucideIcon } from "lucide-react";
import bangladeshTourismImg from "@/assets/bangladesh.png";
import tripadvisorImg from "@/assets/trip23.png";

// Badges rendered under the footer link whose label matches.
const footerBadges = [
  { match: /responsible\s*travel/i, src: bangladeshTourismImg, alt: "Bangladesh Tourism Board" },
  { match: /photo\s*gallery/i, src: tripadvisorImg, alt: "Recommended on Tripadvisor" },
];

// Contact rows are plain CMS links (phone, email, address), so the icon is
// inferred from the label/href rather than stored alongside it.
function contactIcon(label: string, to: string): LucideIcon {
  const text = `${label} ${to}`.toLowerCase();
  // WhatsApp links show the phone number, so they get the call icon too.
  if (text.includes("whatsapp") || text.includes("wa.me")) return Phone;
  if (text.includes("mailto:") || /\S+@\S+\.\S+/.test(text)) return Mail;
  if (text.includes("tel:")) return Phone;
  // Anything else in the contact column is the office address.
  return MapPin;
}

export function SiteFooter() {
  const { footer, header } = useSiteSettings();
  const logoMeta = imageMeta(footer, "logo_url");

  // Rendered under the logo/intro rather than inside a column, so the gap above
  // the copyright row carries them.
  const brandLinks = [
    { label: "Privacy Policy", to: "/privacy-policy" },
    { label: "Terms & Conditions", to: "/terms-conditions" },
    { label: "24/7 Customer Support", to: "/customer-support" },
  ];

  return (
    <footer
      className="shell pt-14 pb-[26px] text-white"
      style={{ background: "linear-gradient(160deg,#123D26,#B5810A)" }}
    >
      <div
        className="wide foot-grid mb-10"
        style={{ "--foot-cols": footer.columns.length } as CSSProperties}
      >
        <div className="col-span-2 nav:col-span-1">
          <img
            src={footer.logo_url || "/logo-white.png"}
            alt={logoMeta.alt || header.logo_alt}
            title={logoMeta.title || undefined}
            className="-mt-4 h-[80px] w-[205px] max-w-full object-contain object-left-top"
          />
          {/* Left-aligned against the base `p { text-align: justify }`: this column is only
              260px wide, and justifying prose that narrow stretches single spaces into
              rivers of whitespace across every line. */}
          <p className="mt-3.5 max-w-[260px] text-left text-[0.85rem] opacity-70">
            <FormatText>{footer.intro}</FormatText>
          </p>
        </div>

        {footer.columns.map((col) => {
          const isContact = col.title.trim().toLowerCase() === "contact";
          const renderLabel = (label: string, to: string) => {
            const Icon = isContact ? contactIcon(label, to) : null;
            if (!Icon) return label;
            return (
              <span className="flex items-start gap-2">
                <Icon className="mt-[3px] size-4 shrink-0 text-gold" aria-hidden="true" />
                <span>{label}</span>
              </span>
            );
          };
          return (
          <div key={col.title}>
            <h4 className="mb-3.5 text-[0.8rem] font-bold tracking-[0.06em] text-gold uppercase">
              {col.title}
            </h4>
            {col.links
              // A link saved without a destination renders as `<Link to="">`, which just
              // reloads the current page. Drop those (and fully blank rows) rather than
              // show a dead link.
              .filter((link) => link.label.trim() && link.to.trim())
              .flatMap((link) => {
              const item = isExternal(link.to) ? (
                <a
                  key={link.label}
                  href={link.to}
                  className="mb-2.5 block text-[0.87rem] opacity-85 transition-opacity hover:opacity-100"
                  {...(link.to.startsWith("http")
                    ? { target: "_blank", rel: "noreferrer noopener" }
                    : {})}
                >
                  {renderLabel(link.label, link.to)}
                </a>
              ) : (
                <Link
                  key={link.label}
                  to={normalizePath(link.to)}
                  className="mb-2.5 block text-[0.87rem] opacity-85 transition-opacity hover:opacity-100"
                >
                  {renderLabel(link.label, link.to)}
                </Link>
              );
              // Some links carry a badge directly underneath them.
              const badge = footerBadges.find((b) => b.match.test(link.label));
              if (!badge) return [item];
              return [
                item,
                <img
                  key={badge.alt}
                  src={badge.src}
                  alt={badge.alt}
                  className="mt-1 mb-2.5 w-[160px] max-w-full"
                />,
              ];
            })}
          </div>
          );
        })}
      </div>

      <div className="wide flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-white/15 pt-[22px] text-[0.78rem] opacity-60">
        <span>{footer.copyright}</span>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5">
          {brandLinks.map((link) => (
            <Link
              key={link.label}
              to={normalizePath(link.to)}
              className="transition-opacity hover:opacity-100"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <span className="tracking-[0.04em]">
          DEVELOPED BY{" "}
          <a
            href="https://www.platiroll.com"
            target="_blank"
            rel="noreferrer noopener"
            className="font-bold text-gold transition-opacity hover:opacity-80"
          >
            PLATIROLL
          </a>
        </span>
      </div>
    </footer>
  );
}
