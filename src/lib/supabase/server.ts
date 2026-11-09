import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@merqo/ui/supabase/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/types";

export async function createServerClient(): Promise<
  SupabaseClient<Database, "printkit">
> {
  return createSupabaseServerClient<Database, "printkit">({
    url: publicEnv.supabaseUrl,
    publishableKey: publicEnv.supabasePublishableKey,
    schema: "printkit",
    cookieDomain: process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN,
  });
}

// Uses the secret key and bypasses RLS: only for Server Actions and Route
// Handlers. Async so callers keep one call shape for both clients.
export async function createServiceClient(): Promise<
  SupabaseClient<Database, "printkit">
> {
  return createSupabaseServiceClient<Database, "printkit">({
    url: publicEnv.supabaseUrl,
    secretKey: process.env.SUPABASE_SECRET_KEY,
    schema: "printkit",
  });
}
