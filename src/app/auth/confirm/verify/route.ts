import { z } from "zod";
import { handleAuthConfirm } from "@merqo/ui/auth";
import { createServerClient } from "@/lib/supabase/server";
import { setRecoveryWindowCookie } from "@/lib/recovery-window";

const verifyResultSchema = z.object({
  session: z.object({ access_token: z.string() }).nullish(),
});

export async function POST(request: Request) {
  return handleAuthConfirm(request, {
    createClient: createServerClient,
    defaultNext: "/dashboard",
    recovery: {
      path: "/reset-password",
      onRecovery: async ({ supabase, data, response }) => {
        const result = verifyResultSchema.safeParse(data);
        if (!result.success) return;
        try {
          await setRecoveryWindowCookie(
            supabase,
            response,
            result.data.session?.access_token,
          );
        } catch {
          // The reset page reports the missing window; failing here would bounce a signed-in user to /login.
        }
      },
    },
  });
}
