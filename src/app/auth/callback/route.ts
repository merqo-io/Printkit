import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/safe-redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const safeNext = safeRedirectPath(searchParams.get("next"), "/dashboard");

  if (!code) return NextResponse.redirect(`${origin}/login?error=oauth`);

  const supabase = await createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/login?error=oauth`);

  return NextResponse.redirect(`${origin}${safeNext}`);
}
