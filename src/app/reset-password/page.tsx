import type { Metadata } from "next";
import { Wordmark } from "@/components/wordmark";
import { createServerClient } from "@/lib/supabase/server";
import { getRecoveryState } from "@/lib/recovery-window";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Set a new password",
};
export default async function ResetPasswordPage() {
  const supabase = await createServerClient();
  const state = await getRecoveryState(supabase);
  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Wordmark className="text-3xl" />
        </div>
        <ResetPasswordForm initialState={state} />
      </div>
    </main>
  );
}
