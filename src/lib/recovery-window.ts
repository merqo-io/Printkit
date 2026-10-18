import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";

export const RECOVERY_WINDOW_COOKIE = "printkit_recovery";
export const RECOVERY_WINDOW_SECONDS = 15 * 60;

export const recoveryWindowCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/reset-password",
  maxAge: RECOVERY_WINDOW_SECONDS,
} as const;

export type RecoveryState = "ready" | "expired" | "failed";

const tokenSchema = z
  .string()
  .regex(/^\d+\.[A-Za-z0-9_-]+$/)
  .transform((value) => {
    const [expiresAt, signature] = value.split(".") as [string, string];
    return { expiresAt: Number(expiresAt), signature };
  });

function signingSecret(): string {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret)
    throw new Error(
      "Missing required environment variable: SUPABASE_SECRET_KEY",
    );
  return secret;
}

function sign(sessionId: string, expiresAt: number): string {
  return createHmac("sha256", signingSecret())
    .update(`printkit-recovery-window:${sessionId}:${expiresAt}`)
    .digest("base64url");
}

/**
 * Mints the recovery-window cookie value `<expiresAt>.<hmac>`. The HMAC binds
 * it to one Supabase session and its expiry, so it can neither be forged on a
 * shared device nor carried over to a later sign-in.
 */
export function mintRecoveryWindow(
  sessionId: string,
  nowMs: number = Date.now(),
): string {
  const expiresAt = Math.floor(nowMs / 1000) + RECOVERY_WINDOW_SECONDS;
  return `${expiresAt}.${sign(sessionId, expiresAt)}`;
}

export function verifyRecoveryWindow(
  value: string | undefined,
  sessionId: string,
  nowMs: number = Date.now(),
): boolean {
  const parsed = tokenSchema.safeParse(value);
  if (!parsed.success) return false;
  const { expiresAt, signature } = parsed.data;
  if (expiresAt * 1000 <= nowMs) return false;
  const expected = Buffer.from(sign(sessionId, expiresAt));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

type ClaimsClient = {
  auth: {
    getClaims(): Promise<{
      data: { claims: { session_id?: string } } | null;
      error: unknown;
    }>;
  };
};

/**
 * Whether the current session may set a new password: it must carry a
 * recovery window minted for it by /auth/callback after a reset-link exchange.
 * Any other signed-in session is treated like an expired link.
 */
export async function getRecoveryState(
  supabase: ClaimsClient,
): Promise<RecoveryState> {
  try {
    const { data, error } = await supabase.auth.getClaims();
    if (error) return "failed";
    const sessionId = data?.claims.session_id;
    if (!sessionId) return "expired";
    const cookieStore = await cookies();
    const value = cookieStore.get(RECOVERY_WINDOW_COOKIE)?.value;
    return verifyRecoveryWindow(value, sessionId) ? "ready" : "expired";
  } catch {
    return "failed";
  }
}
