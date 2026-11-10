import { NextResponse } from "next/server";
import {
  clientIp as sharedClientIp,
  rateLimit as sharedRateLimit,
  rateLimitStrict as sharedRateLimitStrict,
  type RateLimitStore,
} from "@merqo/ui/kit-api";
import { createServiceClient } from "@/lib/supabase/server";

type ServiceClient = Awaited<ReturnType<typeof createServiceClient>>;

export const PAIR_LIMIT = 10;
export const CLOUDPRNT_LIMIT = 120;
export const KIT_IP_LIMIT = 300;
const KIT_LIMIT = 600;
export const AGENT_IP_LIMIT = 240;
export const RATE_WINDOW_SECONDS = 60;

/**
 * Header order for the client IP, in order of trust: `x-vercel-forwarded-for`
 * (set by Vercel's edge, not client-controllable), `x-real-ip`, then the LAST
 * `x-forwarded-for` hop (appended by the nearest proxy; the first hop is
 * whatever the client claimed and is spoofable).
 */
const TRUSTED_IP_HEADERS = [
  "x-vercel-forwarded-for",
  "x-real-ip",
  "x-forwarded-for",
];

/**
 * Best-effort client IP. Returns null when no usable header is present,
 * rather than a shared "unknown" value, so callers decide what a missing IP
 * means: pairing uses one strict shared `pair:noip` bucket (fail closed),
 * while kit and agent pre-auth checks skip the per-IP bucket because a shared
 * one would let anyone without an IP starve every caller; the per-kit and
 * per-credential limits still apply.
 */
export function clientIp(hdrs: Headers): string | null {
  return sharedClientIp(hdrs, { trustedHeaders: TRUSTED_IP_HEADERS });
}

function rpcStore(supabase: ServiceClient): RateLimitStore {
  return {
    async hit(key, limit, windowSeconds) {
      const { data: allowed, error } = await supabase.rpc("check_rate_limit", {
        p_key: key,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      });
      if (error) throw new Error(error.message);
      return allowed !== false;
    },
  };
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
  return sharedRateLimit(rpcStore(supabase), key, limit, windowSeconds);
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
  return sharedRateLimitStrict(rpcStore(supabase), key, limit, windowSeconds);
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
