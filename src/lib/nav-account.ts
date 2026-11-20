import { createServerClient } from "@/lib/supabase/server";

export type NavAccount = { name: string; avatarUrl?: string };

/**
 * The public pages show an account menu without a profile query, so the name
 * comes from the auth user's own metadata.
 */
export function navAccount(user: {
  email?: string;
  user_metadata?: Record<string, unknown>;
}): NavAccount {
  const meta = user.user_metadata ?? {};
  const full = typeof meta.full_name === "string" ? meta.full_name.trim() : "";
  const avatar =
    typeof meta.avatar_url === "string" && meta.avatar_url
      ? meta.avatar_url
      : undefined;
  return { name: full || user.email || "Account", avatarUrl: avatar };
}

/** The signed-in visitor for a public page, or undefined when signed out. */
export async function getNavAccount(): Promise<NavAccount | undefined> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? navAccount(user) : undefined;
}
