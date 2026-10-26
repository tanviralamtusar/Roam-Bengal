import { useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, ChevronDown, X } from "lucide-react";
import { submitInquiry } from "@/lib/capture.functions";
import type { TourDTO } from "@/lib/content-types";

/**
 * "Let's Book Your Trip" — the booking form that opens over the tour page when a
 * visitor clicks Book Now. It is a native <dialog>, so focus trapping, Esc-to-close and
 * the backdrop come from the browser. Submissions land in `inquiries` like the contact
 * form, with the date and head count in their own columns.
 */

const ADULTS = Array.from({ length: 20 }, (_, i) => i + 1);
const CHILDREN = Array.from({ length: 11 }, (_, i) => i);

export function BookingDialog({
  tour,
  tours,
  trigger,
}: {
  tour: TourDTO;
  tours: TourDTO[];
  /** Renders the button that opens the dialog. */
  trigger: (open: () => void) => ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const send = useServerFn(submitInquiry);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  // The current tour is always selectable, even when it is a draft missing from `tours`.
  const options = tours.some((t) => t.slug === tour.slug) ? tours : [tour, ...tours];
  const today = new Date().toISOString().slice(0, 10);

  function open() {
    if (state !== "sending") setState("idle");
    ref.current?.showModal();
  }

  /** Plays the `data-closing` exit animation (app.css) before really closing. */
  function close() {
    const dialog = ref.current;
    if (!dialog?.open || dialog.hasAttribute("data-closing")) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      dialog.close();
      return;
    }
    dialog.setAttribute("data-closing", "");
    // Only the dialog's own animation counts; one bubbling up from a child must not end it early.
    const done = (e: AnimationEvent) => {
      if (e.target !== dialog) return;
      dialog.removeEventListener("animationend", done);
      dialog.removeAttribute("data-closing");
      dialog.close();
    };
    dialog.addEventListener("animationend", done);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const adults = Number(form.get("adults") ?? 1);
    const children = Number(form.get("children") ?? 0);
    const notes = String(form.get("notes") ?? "").trim();
    const party = `${adults} ${adults === 1 ? "adult" : "adults"}, ${children} ${
      children === 1 ? "child" : "children"
    }`;

    setState("sending");
    setError("");
    try {
      await send({
        data: {
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          phone: String(form.get("phone") ?? ""),
          tour_slug: String(form.get("tour_slug") ?? ""),
          start_date: String(form.get("start_date") ?? ""),
          travelers: adults + children,
          message: notes ? `Booking request — ${party}.\n\n${notes}` : `Booking request — ${party}.`,
        },
      });
      setState("done");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <>
      {trigger(open)}

      <dialog
        ref={ref}
        aria-labelledby="booking-title"
        // Esc would close instantly; route it through `close` so it animates too.
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        // Clicking the backdrop (the dialog element itself, outside the panel) closes it.
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="booking-dialog m-auto w-[calc(100%-32px)] max-w-[700px] overflow-hidden rounded-2xl bg-black p-0 text-white shadow-2xl [color-scheme:dark] backdrop:bg-black/70"
      >
        <header className="relative bg-green-dark px-5 py-4 md:px-6">
          <p className="text-[0.72rem] font-semibold tracking-[0.04em] text-gold uppercase">
            Roam Bengal · Private Tours
          </p>
          <h2
            id="booking-title"
            className="mt-1 font-display text-[clamp(1.4rem,3vw,1.75rem)] leading-tight font-bold text-white"
          >
            Let&apos;s Book Your Trip
          </h2>
          <p className="mt-1 text-[0.86rem] text-white/85">
            A few details to get your Bangladesh adventure started.
          </p>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute top-3 right-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white/80 hover:bg-white/15 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {state === "done" ? (
          <div className="px-5 py-10 text-center md:px-6">
            <div className="text-[2rem]" aria-hidden="true">
              ✅
            </div>
            <h3 className="mt-2 font-display text-[1.2rem] font-bold text-white">
              Booking request received.
            </h3>
            <p className="mx-auto mt-2 max-w-[420px] text-center text-[0.9rem] leading-7 text-white/70">
              We reply to every request personally — usually the same day — to confirm
              availability and the details of your tour.
            </p>
            <button type="button" onClick={close} className={`${SUBMIT} mt-6 min-w-[200px]`}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="px-5 py-5 md:px-6">
            <div className="flex flex-col gap-4">
              <Control label="Which tour interests you?" htmlFor="bk-tour">
                <SelectBox id="bk-tour" name="tour_slug" defaultValue={tour.slug}>
                  {options.map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.title}
                    </option>
                  ))}
                </SelectBox>
              </Control>

              <Control label="Preferred tour date" htmlFor="bk-date">
                <div className="relative">
                  <CalendarDays
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-white/70"
                  />
                  <input
                    id="bk-date"
                    name="start_date"
                    type="date"
                    min={today}
                    required
                    className={`${FIELD} pl-11`}
                  />
                </div>
              </Control>

              <div className="grid grid-cols-2 gap-3">
                <Control label="Adults" htmlFor="bk-adults">
                  <SelectBox id="bk-adults" name="adults" defaultValue="2">
                    {ADULTS.map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "adult" : "adults"}
                      </option>
                    ))}
                  </SelectBox>
                </Control>
                <Control label="Children" htmlFor="bk-children">
                  <SelectBox id="bk-children" name="children" defaultValue="0">
                    {CHILDREN.map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "child" : "children"}
                      </option>
                    ))}
                  </SelectBox>
                </Control>
              </div>

              <hr className="my-2 border-white/10" />

              <Control label="Full name" htmlFor="bk-name">
                <input
                  id="bk-name"
                  name="name"
                  required
                  autoComplete="name"
                  placeholder="Your full name"
                  className={FIELD}
                />
              </Control>

              <Control label="Email address" htmlFor="bk-email">
                <input
                  id="bk-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={FIELD}
                />
              </Control>

              <Control label="WhatsApp number (optional)" htmlFor="bk-phone">
                <input
                  id="bk-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+Country code and number"
                  className={FIELD}
                />
              </Control>

              <Control label="Anything else we should know? (optional)" htmlFor="bk-notes">
                <textarea
                  id="bk-notes"
                  name="notes"
                  rows={3}
                  maxLength={1800}
                  placeholder="Your interests, special requests or travel plans..."
                  className={`${FIELD} resize-y rounded-[10px]`}
                />
              </Control>
            </div>

            {state === "error" ? (
              <p role="alert" className="mt-4 text-[0.84rem] text-red-400">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={state === "sending"}
              className={`${SUBMIT} mt-5 w-full`}
            >
              {state === "sending" ? "Sending…" : "Continue Booking"}
            </button>
          </form>
        )}
      </dialog>
    </>
  );
}

const FIELD =
  "w-full rounded-[30px] border border-white/25 bg-black px-4 py-3 " +
  "font-body text-[0.9rem] text-white outline-none placeholder:text-white/55 focus:border-white/70";

/** The light pill from the design, on the dark form. */
const SUBMIT =
  "inline-flex cursor-pointer items-center justify-center rounded-[30px] bg-[#ececec] px-6 py-3 " +
  "text-[0.9rem] font-semibold text-black transition-colors duration-200 hover:bg-white " +
  "disabled:cursor-wait disabled:opacity-70";

function Control({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[0.84rem] font-semibold text-white/85">
        {label}
      </label>
      {children}
    </div>
  );
}

/** A pill <select> with the chevron drawn by us, so it looks the same in every browser. */
function SelectBox({
  children,
  ...rest
}: { children: ReactNode } & React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select {...rest} className={`${FIELD} cursor-pointer appearance-none pr-11`}>
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-white/70"
      />
    </div>
  );
}
