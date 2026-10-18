import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { AUTH_NEXT_COOKIE, AUTH_NEXT_PATH } from "@/lib/auth-return";
import {
  RECOVERY_WINDOW_COOKIE,
  mintRecoveryWindow,
  recoveryWindowCookieOptions,
} from "@/lib/recovery-window";

const RESET_PASSWORD_PATH = "/reset-password";

// supabase-js returns `redirectType` at runtime (documented in its JSDoc
// example) but leaves it out of the declared return type.
const exchangeResultSchema = z.object({
  redirectType: z.string().nullish(),
});

function readNext(request: Request): string | null {
  const queryNext = new URL(request.url).searchParams.get("next");
  if (queryNext !== null) return queryNext;
  const cookie = new Headers(request.headers)
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_NEXT_COOKIE}=`));
  if (!cookie) return null;
  try {
    return decodeURIComponent(cookie.slice(AUTH_NEXT_COOKIE.length + 1));
  } catch {
    return null;
  }
}

function redirect(url: string): NextResponse {
  const response = NextResponse.redirect(url);
  response.cookies.set(AUTH_NEXT_COOKIE, "", {
    path: AUTH_NEXT_PATH,
    maxAge: 0,
  });
  return response;
}

/**
 * A reset link's exchange comes back with `redirectType: "recovery"`, which
 * supabase-js derives from the code verifier `resetPasswordForEmail` stored.
 * Only that exchange opens a recovery window and goes to the reset page; any
 * other sign-in returns to `next` (query param, else the login page's cookie).
 */
export async function GET(request: Request | NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const safeNext = safeRedirectPath(readNext(request), "/dashboard");

  if (!code) return redirect(`${origin}/login?error=oauth`);

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return redirect(`${origin}/login?error=oauth`);

  const exchange = exchangeResultSchema.safeParse(data);
  if (!exchange.success || exchange.data.redirectType !== "recovery")
    return redirect(`${origin}${safeNext}`);

  const response = redirect(`${origin}${RESET_PASSWORD_PATH}`);
  const accessToken = data?.session?.access_token;
  if (accessToken) {
    const { data: claims } = await supabase.auth.getClaims(accessToken);
    const sessionId = claims?.claims.session_id;
    if (sessionId) {
      response.cookies.set(
        RECOVERY_WINDOW_COOKIE,
        mintRecoveryWindow(sessionId),
        recoveryWindowCookieOptions,
      );
    }
  }
  return response;
}
