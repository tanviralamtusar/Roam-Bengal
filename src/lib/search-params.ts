/**
 * Field checks for route `validateSearch` functions.
 *
 * Route definitions — `validateSearch` included — are in the entry chunk every page
 * downloads, and a handful of one-field zod schemas there were the only reason zod
 * (~60 kB) shipped on first load. These cover what those schemas did.
 *
 * Search values arrive JSON-parsed (`?tour=123` is the number 123), so anything of the
 * wrong type or outside the allowed set reads as absent rather than throwing a route error.
 */

export function searchString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function searchEnum<const T extends string>(
  value: unknown,
  options: readonly T[],
): T | undefined {
  return typeof value === "string" && (options as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}
