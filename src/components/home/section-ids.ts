/**
 * The homepage section ids, in code order, with nothing else attached.
 *
 * They live apart from `registry.ts` because the root route reads the stored section
 * order on every page (`useHomeLayout` → `lib/home-layout.ts`). Importing the registry
 * for that pulled every homepage section component into the JS that every page downloads.
 * `registry.ts` maps each id to its component, and its `Record<HomeSectionId, …>` type
 * still makes adding an id here without registering a section a compile error.
 */
export const HOME_SECTION_IDS = [
  "features",
  "tripBuilder",
  "popularTours",
  "gallery",
  "faith",
  "multiDayTours",
  "journal",
  "holidayTours",
  "reviews",
  "whyChooseUs",
  "dreamCta",
] as const;

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

export const DEFAULT_HOME_ORDER: HomeSectionId[] = [...HOME_SECTION_IDS];

export function isHomeSectionId(value: unknown): value is HomeSectionId {
  return typeof value === "string" && (HOME_SECTION_IDS as readonly string[]).includes(value);
}
