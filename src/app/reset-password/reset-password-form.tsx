"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@merqo/ui/primitives";
import { Input } from "@merqo/ui/primitives";
import { Label } from "@merqo/ui/primitives";
import { ElevatedCard, useAsyncAction, navigatingAway } from "@merqo/ui";
import { passwordChangeSchema } from "@/lib/password-change";
import type { RecoveryState } from "@/lib/recovery-window";
import { updatePasswordAction } from "./actions";

/**
 * Sets a new password once the server has confirmed a recovery window: the
 * reset link's code was exchanged at /auth/callback for this session within
 * the last few minutes. A plain signed-in session, or a used or expired link,
 * gets the expired card and a route back to sign in instead of the form.
 */
export function ResetPasswordForm({
  initialState,
}: {
  initialState: RecoveryState;
}) {
  const router = useRouter();
  const [state, setState] = useState<RecoveryState>(initialState);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { pending, run } = useAsyncAction((fn: () => Promise<void>) => fn());

  function submit() {
    if (state !== "ready" || pending) return;
    const parsed = passwordChangeSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ??
          "Could not use that password. Check both fields.",
      );
      return;
    }
    setError(null);
    return run(async () => {
      try {
        const result = await updatePasswordAction(parsed.data);
        if (!result.success) {
          if (result.expired) setState("expired");
          else toast.error(result.error);
          return;
        }
        toast.success("Password updated");
        router.push("/dashboard");
        router.refresh();
        await navigatingAway();
      } catch {
        toast.error("Could not update your password. Try again in a minute.");
      }
    });
  }

  if (state === "expired" || state === "failed") {
    return (
      <ElevatedCard className="px-7 py-8">
        <h1 className="font-display text-2xl font-semibold leading-tight">
          {state === "failed"
            ? "Could not check your reset link"
            : "This link has expired"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {state === "failed"
            ? "Check your connection and reload this page, or go back to sign in."
            : "Reset links work once and expire after a short while. Request a new one from the sign-in page."}
        </p>
        <Button
          asChild
          variant="outline"
          className="mt-6 h-11 w-full rounded-xl"
        >
          <Link href="/login">Back to sign in</Link>
        </Button>
      </ElevatedCard>
    );
  }

  return (
    <ElevatedCard className="px-7 py-8">
      <h1 className="font-display text-2xl font-semibold leading-tight">
        Set a new password
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Use at least 8 characters.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-6 space-y-5"
      >
        <div className="space-y-2">
          <Label htmlFor="new-password" className="text-sm font-medium">
            New password
          </Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-xl text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password" className="text-sm font-medium">
            Confirm new password
          </Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "reset-password-error" : undefined}
            className="h-11 rounded-xl text-base"
          />
          {error && (
            <p
              id="reset-password-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {error}
            </p>
          )}
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={pending || !password || !confirm}
          className="h-12 w-full rounded-xl text-base font-semibold"
        >
          {pending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </ElevatedCard>
  );
}
