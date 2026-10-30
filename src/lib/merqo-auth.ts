import { timingSafeEqual } from "node:crypto";

/** Constant-time check of merqo's bearer token against MERQO_METRICS_SECRET. */
export function bearerOk(request: Request): boolean {
  const secret = process.env.MERQO_METRICS_SECRET;
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
