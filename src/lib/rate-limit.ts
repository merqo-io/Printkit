import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

type ServiceClient = Awaited<ReturnType<typeof createServiceClient>>;

export const PAIR_LIMIT = 10;
export const CLOUDPRNT_LIMIT = 120;
export const KIT_IP_LIMIT = 300;
export const KIT_LIMIT = 600;
export const AGENT_IP_LIMIT = 240;
export const RATE_WINDOW_SECONDS = 60;

/**
 * Best-effort client IP, in order of trust: `x-vercel-forwarded-for` (set by
 * Vercel's edge, not client-controllable), `x-real-ip`, then the LAST
 * `x-forwarded-for` hop (the one appended by the nearest proxy; the first hop
 * is whatever the client claimed and is spoofable). Returns null when no
 * header is present, rather than a shared "unknown" value, so callers decide
 * what a missing IP means: pairing uses one strict shared `pair:noip` bucket
 * (fail closed), while kit and agent pre-auth checks skip the per-IP bucket
 * because a shared one would let anyone without an IP starve every caller;
 * the per-kit and per-credential limits still apply.
 */
export function clientIp(hdrs: Headers): string | null {
  const vercel = hdrs.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercel) return vercel;
  const real = hdrs.get("x-real-ip")?.trim();
  if (real) return real;
  const hops = hdrs.get("x-forwarded-for")?.split(",");
  const last = hops?.[hops.length - 1]?.trim();
  return last || null;
}

async function check(
  supabase: ServiceClient,
  bucket: { key: string; limit: number; windowSeconds: number },
  failClosed: boolean,
): Promise<boolean> {
  const { key, limit, windowSeconds } = bucket;
  const mode = failClosed ? "closed" : "open";
  try {
    const { data: allowed, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error(`rateLimit degraded (failing ${mode})`, error.message);
      return !failClosed;
    }
    return allowed !== false;
  } catch {
    console.error(`rateLimit unavailable (failing ${mode})`);
    return !failClosed;
  }
}

/**
 * True when the call is allowed. Fails open: a limiter error must never stop
 * a real printer or an order from printing, since the limiter only guards
 * against floods. Use `rateLimitStrict` where an outage would otherwise
 * remove the only brake on guessing a secret.
 */
export function rateLimit(
  supabase: ServiceClient,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  return check(supabase, { key, limit, windowSeconds }, false);
}

/**
 * Like `rateLimit` but fails closed (false on an RPC error or throw), for
 * endpoints that exchange a brute-forceable secret, e.g. the pairing code.
 */
export function rateLimitStrict(
  supabase: ServiceClient,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  return check(supabase, { key, limit, windowSeconds }, true);
}

export function tooManyRequests(): NextResponse {
  return NextResponse.json(
    { error: "Too many requests" },
    { status: 429, headers: { "Retry-After": String(RATE_WINDOW_SECONDS) } },
  );
}

/**
 * Pre-auth per-IP check for token routes. Returns a 429 response when
 * limited, otherwise null. Runs before any credential lookup so floods of bad
 * credentials are throttled before they reach the database. A request with
 * no resolvable IP skips this bucket (see `clientIp`).
 */
export async function enforceIpLimit(
  request: Request,
  prefix: "kit-ip" | "agent-ip",
  limit: number,
): Promise<NextResponse | null> {
  const ip = clientIp(request.headers);
  if (!ip) return null;
  const allowed = await rateLimit(
    await createServiceClient(),
    `${prefix}:${ip}`,
    limit,
    RATE_WINDOW_SECONDS,
  );
  return allowed ? null : tooManyRequests();
}

/** Post-auth per-kit check; returns a 429 response when limited. */
export async function enforceKitLimit(
  kitSlug: string,
): Promise<NextResponse | null> {
  const allowed = await rateLimit(
    await createServiceClient(),
    `kit:${kitSlug}`,
    KIT_LIMIT,
    RATE_WINDOW_SECONDS,
  );
  return allowed ? null : tooManyRequests();
}
