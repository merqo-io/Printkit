import { createServiceClient } from "@/lib/supabase/server";
import { LABELS_UPGRADE_LINK_TEXT } from "@/lib/labels-upgrade";

/** Dashboard copy shown when a vendor without label access tries to print. */
export const LABELS_UPGRADE_MESSAGE = `Label printing needs a paid plan or an active event pass. ${LABELS_UPGRADE_LINK_TEXT} to print labels.`;

/** Stable error code qkit and the dashboard branch on when labels are blocked. */
export const LABELS_NOT_ENTITLED = "labels_not_entitled";

/**
 * Whether a vendor may print labels: a live "paid" entitlement or a running
 * event pass. Returns null when the lookup fails so callers fail closed
 * instead of treating an outage as a grant. A vendor with no row is denied.
 */
export async function vendorHasLabelAccess(
  vendorId: string,
): Promise<boolean | null> {
  try {
    const supabase = await createServiceClient();
    const { data, error } = await supabase.rpc("vendor_has_label_access", {
      p_vendor: vendorId,
    });
    if (error) {
      console.error("vendorHasLabelAccess failed", error.message);
      return null;
    }
    return data === true;
  } catch (err) {
    console.error("vendorHasLabelAccess threw", err);
    return null;
  }
}
