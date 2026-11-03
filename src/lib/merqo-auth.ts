import { timingSafeEqual } from "node:crypto";

function bearerMatches(request: Request, secret: string | undefined): boolean {
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;
  const provided = Buffer.from(header.slice(prefix.length));
  const expected = Buffer.from(secret);
  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}

/** Constant-time check of merqo's bearer token against MERQO_METRICS_SECRET. */
export function bearerOk(request: Request): boolean {
  return bearerMatches(request, process.env.MERQO_METRICS_SECRET);
}

/**
 * Constant-time check against MERQO_PROVISION_SECRET, the secret merqo uses
 * for state-changing pushes. Kept separate from the metrics secret so a read
 * credential can never write.
 */
export function provisionBearerOk(request: Request): boolean {
  return bearerMatches(request, process.env.MERQO_PROVISION_SECRET);
}
