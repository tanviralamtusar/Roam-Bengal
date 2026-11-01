import { WhatsAppIcon } from "@/components/art/logo-mark";
import { useSiteSettings } from "@/hooks/use-site-settings";

/** Fixed bottom-right pill, present on every page in the reference designs.
 *  `className` lets a page lift it clear of its own fixed bottom bar.
 *
 *  `z-40`: above all page content and the header, but under the mobile nav drawer's
 *  `z-50` — any higher and the pill floats on top of the open drawer. */
export function WhatsAppFloat({ className = "" }: { className?: string }) {
  const { whatsapp } = useSiteSettings();

  return (
    <a
      href={whatsapp.link}
      target="_blank"
      rel="noreferrer noopener"
      className={`fixed right-[22px] bottom-[22px] z-40 inline-flex items-center gap-2.5 rounded-[40px] bg-[#25D366] py-3 pr-[18px] pl-3.5 text-[0.86rem] font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.2)] transition-colors hover:bg-[#1FBE5A] ${className}`}
    >
      <WhatsAppIcon className="h-[22px] w-[22px]" />
      <span className="hidden sm:inline">{whatsapp.float_label}</span>
      <span className="sr-only sm:hidden">{whatsapp.float_label}</span>
    </a>
  );
}
