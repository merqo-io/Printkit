"use server";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase/server";
import { passwordChangeSchema } from "@/lib/password-change";
import {
  RECOVERY_WINDOW_COOKIE,
  getRecoveryState,
  recoveryWindowCookieOptions,
} from "@/lib/recovery-window";

export type UpdatePasswordResult =
  { success: true } | { success: false; error: string; expired?: true };

/**
 * Sets a new password only for a session holding its recovery window, then
 * closes the window so the same session cannot change the password again.
 */
export async function updatePasswordAction(
  input: unknown,
): Promise<UpdatePasswordResult> {
  const parsed = passwordChangeSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues.find((i) => i.path.length > 0);
    return { success: false, error: issue?.message ?? "Check your password" };
  }

  const supabase = await createServerClient();
  const state = await getRecoveryState(supabase);
  if (state === "failed")
    return {
      success: false,
      error: "Could not check your reset link. Please try again.",
    };
  if (state === "expired")
    return {
      success: false,
      expired: true,
      error: "This reset link has expired.",
    };

  try {
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    if (error) return { success: false, error: error.message };
  } catch {
    return {
      success: false,
      error: "Could not update your password. Please try again.",
    };
  }

  const cookieStore = await cookies();
  cookieStore.delete({
    name: RECOVERY_WINDOW_COOKIE,
    path: recoveryWindowCookieOptions.path,
  });
  return { success: true };
}
