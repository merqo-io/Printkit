import { redirect } from "next/navigation";
import { checkLegalAcceptance as checkSharedLegalAcceptance } from "@merqo/ui/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { merqoBaseUrl } from "@merqo/ui/kit-api";

/**
 * Is this vendor's terms + privacy acceptance current with the versions
 * @merqo/ui's LEGAL_VERSIONS requires? Merqo owns the acceptance record, so
 * the shared check asks it and caches the answer in printkit.legal_check_state.
 * Fails closed, which routes the vendor to /legal/accept.
 */
export function checkLegalAcceptance(email: string): Promise<boolean> {
  return checkSharedLegalAcceptance(email, {
    createClient: createServiceClient as never,
    customerSecret: process.env.MERQO_CUSTOMER_SECRET,
    merqoBaseUrl: merqoBaseUrl(),
  });
}

/**
 * Page/layout guard companion to the auth-gate helpers: bounce a signed-in
 * vendor with a stale or missing legal acceptance to the /legal/accept
 * interstitial. Called at the same point unauthenticated users are sent to
 * /login. A no-op when `email` is falsy (the caller has already handled the
 * no-session case) so it never runs after that redirect has fired.
 */
export async function requireCurrentLegalAcceptance(
  email: string | undefined | null,
): Promise<void> {
  if (email && !(await checkLegalAcceptance(email))) {
    redirect("/legal/accept");
  }
}
