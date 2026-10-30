import type { createServiceClient } from "@/lib/supabase/server";

export const PAIR_LIMIT = 10;
export const CLOUDPRNT_LIMIT = 120;
export const RATE_WINDOW_SECONDS = 60;

/**
 * Best-effort client IP: the first `x-forwarded-for` hop, else `x-real-ip`.
 * Spoofable, so it is a fairness key for the flood guard, never an authz signal.
 */
export function clientIp(hdrs: Headers): string {
  return (
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * True when the call is allowed. Fails open: a limiter error must never stop
 * a real printer or pairing, since the limiter only guards against floods.
 */
export async function rateLimit(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const { data: allowed, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error)
      console.error("rateLimit degraded (failing open)", error.message);
    return allowed !== false;
  } catch {
    console.error("rateLimit unavailable (failing open)");
    return true;
  }
}
