import type { createServiceClient } from "@/lib/supabase/server";

const LIST_USERS_PAGE_SIZE = 1000;
// Guards against an admin API that returns full pages forever.
const LIST_USERS_MAX_PAGES = 50;

export type AdminAuthUser = { id: string; email: string | null };

/** Every auth user across listUsers() pages; a partial page is the last. */
export async function listAllUsers(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
): Promise<{
  data: { users: AdminAuthUser[] } | null;
  error: { message: string } | null;
}> {
  const users: AdminAuthUser[] = [];
  for (let page = 1; page <= LIST_USERS_MAX_PAGES; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: LIST_USERS_PAGE_SIZE,
    });
    if (error) return { data: null, error };
    users.push(
      ...data.users.map((u) => ({ id: u.id, email: u.email ?? null })),
    );
    if (data.users.length < LIST_USERS_PAGE_SIZE)
      return { data: { users }, error: null };
  }
  return {
    data: null,
    error: { message: "Auth user pagination limit reached" },
  };
}
