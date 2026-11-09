import { type NextRequest } from "next/server";
import { createProxy } from "@merqo/ui/next";
import { NONCE_PREFIXES } from "@/lib/nonce-routes";
import { updateSession } from "@/lib/supabase/middleware";

// Built per request so the environment is read at call time; the NEXT_PUBLIC
// reference stays literal so Next inlines it.
export function proxy(request: NextRequest) {
  return createProxy({
    updateSession,
    noncePrefixes: NONCE_PREFIXES,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  })(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
