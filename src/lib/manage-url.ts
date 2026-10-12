import { publicSiteUrl } from "@/lib/site-url";

/** The element id of one location's row on the printers list. */
export function locationRowId(locationId: string): string {
  return `booth-${locationId}`;
}

/**
 * The printkit page a vendor should open for one of a calling kit's
 * locations, as an absolute URL. A calling kit links to this instead of
 * building printkit paths itself, so a page here can move without a change
 * in any other kit.
 *
 * No active location: the printers list, which says what to do next. The
 * picker is not offered, because given an id it cannot find it falls back
 * to the vendor's first booth.
 * A location with no printer: the picker for that location.
 * A location with a printer: its row on the printers list.
 *
 * `requestOrigin` is used only when no public origin is configured, so a
 * link never starts with "null".
 */
export function locationManageUrl(
  requestOrigin: string,
  location: { id: string } | null,
  hasPrinter: boolean,
): string {
  const origin = publicSiteUrl() ?? requestOrigin;
  if (!location) return `${origin}/dashboard/printers`;

  const id = encodeURIComponent(location.id);
  return hasPrinter
    ? `${origin}/dashboard/printers#${locationRowId(id)}`
    : `${origin}/dashboard/printers/new?location=${id}`;
}
