"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ElevatedCard,
  PasswordRequirementsHint,
  ResetPasswordForm as SharedResetPasswordForm,
  navigatingAway,
} from "@merqo/ui";
import type { RecoveryState } from "@/lib/recovery-window";
import { updatePasswordAction } from "./actions";

const UPDATE_FAILED = "Could not update your password. Try again in a minute.";

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

  return (
    <ElevatedCard className="px-7 py-8">
      <SharedResetPasswordForm
        state={state}
        title="Set a new password"
        signInHref="/login"
        LinkComponent={Link}
        passwordLabelSlot={<PasswordRequirementsHint />}
        minLength={1}
        tooShortMessage="Enter a new password."
        mismatchMessage="Passwords do not match. Type the same one twice."
        errorFallback={UPDATE_FAILED}
        expiredTitle="This link has expired"
        expiredBody="Reset links work once and expire after a short while. Request a new one from the sign-in page."
        failedTitle="Could not check your reset link"
        failedBody="Check your connection and reload this page, or go back to sign in."
        submitLabel="Update password"
        confirmLabel="Confirm new password"
        mapError={(message) => message}
        onSubmit={async (password) => {
          // mapError passes strings through, so a transport failure is
          // converted here rather than letting its raw message through.
          const result = await updatePasswordAction({
            password,
            confirm: password,
          }).catch(() => null);
          if (!result) return UPDATE_FAILED;
          if (!result.success) {
            if (result.expired) {
              setState("expired");
              return;
            }
            return result.error;
          }
          toast.success("Password updated");
          router.push("/dashboard");
          router.refresh();
          await navigatingAway();
        }}
      />
    </ElevatedCard>
  );
}
