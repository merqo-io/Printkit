"use client";

import { useEffect, useRef, useState } from "react";
import { useAsyncAction } from "@/hooks/use-async-action";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reprintJob } from "./actions";

/**
 * Reprint behind a confirm step: a stray double tap on "Reprint" only opens
 * the question, and the confirm button is disabled while the request runs, so
 * one tap can never queue two labels.
 */
export function ReprintButton({
  jobId,
  boothLabel,
}: {
  jobId: string;
  boothLabel?: string | null;
}) {
  const { pending, run } = useAsyncAction();
  const [confirming, setConfirming] = useState(false);
  const reprintRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);

  // Swapping the button for the question would otherwise drop focus to body.
  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
    else if (wasConfirming.current) reprintRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  const confirm = () =>
    run(async () => {
      const result = await reprintJob(jobId);
      if (result.success) {
        toast.success(
          boothLabel
            ? `Label sent to print again at ${boothLabel}.`
            : "Label sent to print again.",
        );
      } else toast.error(result.error);
    })
      .catch(() =>
        toast.error("Could not queue the reprint. Please try again."),
      )
      .finally(() => setConfirming(false));

  if (!confirming) {
    return (
      <Button
        ref={reprintRef}
        size="sm"
        variant="outline"
        onClick={() => setConfirming(true)}
        className="pointer-coarse:h-10"
      >
        Reprint
      </Button>
    );
  }

  return (
    <div role="group" aria-label="Confirm reprint" className="space-y-2">
      <p className="text-sm">Print this label again?</p>
      <div className="flex gap-2">
        <Button
          ref={confirmRef}
          size="sm"
          onClick={confirm}
          disabled={pending}
          className="pointer-coarse:h-10"
        >
          {pending ? "Printing…" : "Yes, print"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="pointer-coarse:h-10"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
