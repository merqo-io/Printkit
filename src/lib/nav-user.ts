import { toNavUser, type NavUser } from "@merqo/ui";
import { createServerClient } from "@/lib/supabase/server";
import { getOrCreateVendorProfile } from "@/lib/merqo-vendor-profile";

/**
 * The signed-in visitor for a public page, or null when signed out. The
 * vendor's stall name comes from merqo's vendor profile so the public menu
 * shows the same name as the dashboard; a failed read falls back to the auth
 * user's own name rather than breaking a public page.
 */
export async function getNavUser(): Promise<NavUser | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  let vendorName: string | undefined;
  try {
    vendorName =
      (await getOrCreateVendorProfile(supabase, user.id, null)).stall_name ||
      undefined;
  } catch (err) {
    console.error("getNavUser: vendor profile read failed", err);
  }
  return toNavUser(user, vendorName);
}
