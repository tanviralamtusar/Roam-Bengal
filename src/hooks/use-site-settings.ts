import { getRouteApi } from "@tanstack/react-router";
import { siteDefaults, type SiteDefaults } from "@/content/site-defaults";
import type { SettingsMap } from "@/lib/content-types";
import { HOME_LAYOUT_KEY, resolveHomeLayout, type HomeLayout } from "@/lib/home-layout";
import { createDraftChannel } from "@/lib/preview";

const rootRoute = getRouteApi("__root__");

/**
 * `site_settings` key → unsaved edited value. A map rather than a single `{key,value}` pair
 * because one editor screen (the homepage builder) can have two rows open for edit at once —
 * the section copy (`homepage`) and the section order (`home_layout`) — and the preview needs
 * both applied together.
 */
type SettingsDraftMap = Record<string, unknown>;

/**
 * The settings admin editor only ever has one screen open at a time, so unlike a tour or
 * post preview there is no page/slug to gate this on — being embedded in an iframe at all
 * (`useDraft`'s own `window.parent === window` check) is exactly the signal that a preview
 * is live. Wiring the channel in here, once, covers every page that reads its copy through
 * `useSiteSettings()` instead of threading `?preview=1` through six different routes.
 *
 * It does NOT reach the standalone `info_*` / `policy_*` pages, whose rows are not in the
 * root loader at all. Those call `useSettingGroup()` below, which applies the same draft.
 */
export const settingsPreviewChannel = createDraftChannel<SettingsDraftMap>("settings");

/**
 * Deep-merges stored `site_settings` JSON over the code defaults.
 *
 * Objects merge key by key; arrays replace wholesale. A partial edit in the admin panel
 * is therefore always safe — anything the editor left out falls back to the shipped
 * default rather than rendering blank.
 */
export function mergeSettings<T>(defaults: T, stored: unknown): T {
  if (stored === null || stored === undefined) return defaults;
  if (Array.isArray(defaults) || Array.isArray(stored)) return stored as T;
  if (!isPlainObject(defaults) || !isPlainObject(stored)) return stored as T;

  const out: Record<string, unknown> = { ...defaults };
  for (const [key, value] of Object.entries(stored)) {
    out[key] = key in defaults ? mergeSettings((defaults as never)[key], value) : value;
  }
  return out as T;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Site chrome and page copy: the `site_settings` rows loaded by the root route, merged
 * over the shipped defaults.
 */
export function useSiteSettings(): SiteDefaults {
  const stored = rootRoute.useLoaderData() as SettingsMap | undefined;
  const draft = settingsPreviewChannel.useDraft(true);
  const withDraft = draft ? { ...stored, ...draft } : stored;
  return mergeSettings(siteDefaults, withDraft ?? {});
}

/**
 * One `site_settings` row, merged over its defaults, with the unsaved admin draft applied.
 *
 * The standalone `info_*` / `policy_*` pages do not get their body copy through
 * `useSiteSettings()`: the root loader leaves their rows out (each is a whole page of copy
 * that would otherwise ride along in every page's HTML), so each page loads its own row
 * with `getPageSetting` and passes it in as `stored`. Going through here rather than using
 * that row directly is what applies the admin editor's unsaved draft to the preview.
 */
export function useSettingGroup<T>(key: string, defaults: T, stored: unknown): T {
  const draft = settingsPreviewChannel.useDraft(true);
  const value = draft && key in draft ? draft[key] : stored;
  return mergeSettings(defaults, value ?? {});
}

/**
 * Homepage section order + visibility, from the `homepage_layout` row.
 *
 * Deliberately separate from `useSiteSettings()`/`mergeSettings`: `mergeSettings` replaces
 * arrays wholesale, which is the wrong fallback semantic for a reorderable section list —
 * `resolveHomeLayout` already dedupes, drops unknown ids, and appends any section the stored
 * layout has never seen, so it needs no entry in `site-defaults.ts`.
 */
export function useHomeLayout(): HomeLayout {
  const stored = rootRoute.useLoaderData() as SettingsMap | undefined;
  const draft = settingsPreviewChannel.useDraft(true);
  return resolveHomeLayout(draft?.[HOME_LAYOUT_KEY] ?? stored?.[HOME_LAYOUT_KEY]);
}
