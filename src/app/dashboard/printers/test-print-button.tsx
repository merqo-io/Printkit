"use client";

import { useId, useState } from "react";
import { Button } from "@merqo/ui/primitives";
import { LabelsUpgradeMessage } from "@/components/labels-upgrade-message";
import { sendTestPrint } from "./actions";

type Outcome = {
  tone: "ok" | "error";
  text: string;
  upgradeUrl?: string;
} | null;

/**
 * Sends one sample label to a booth's printer. Shared by the Printers page
 * rows and the setup wizard's connected state; the message sits inline so the
 * vendor sees the result next to the button they pressed.
 */
export function TestPrintButton({
  locationId,
  size = "sm",
  offline = false,
}: {
  locationId: string;
  size?: "sm" | "default";
  /** From printers.last_seen_at health, read by the server page. */
  offline?: boolean;
}) {
  const offlineId = useId();
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);

  const send = async () => {
    if (busy) return;
    setBusy(true);
    setOutcome(null);
    try {
      const result = await sendTestPrint(locationId);
      setOutcome(
        result.ok
          ? {
              tone: "ok",
              text: result.offline
                ? "Test label queued. It will print when the printer is back online."
                : "Test label sent. It should print in a few seconds.",
            }
          : {
              tone: "error",
              text: result.error,
              upgradeUrl: result.upgradeUrl,
            },
      );
    } catch {
      setOutcome({
        tone: "error",
        text: "Could not send the test label. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size={size}
        onClick={send}
        disabled={busy || offline}
        aria-describedby={offline ? offlineId : undefined}
      >
        {busy ? "Sending…" : "Print test label"}
      </Button>
      {offline && (
        <p id={offlineId} className="text-muted-foreground w-full text-sm">
          The printer is offline. Test printing is off until it is back online.
        </p>
      )}
      {outcome && (
        <p
          role={outcome.tone === "error" ? "alert" : "status"}
          className={
            outcome.tone === "error"
              ? "text-destructive w-full text-sm"
              : "text-success-text w-full text-sm"
          }
        >
          {outcome.upgradeUrl ? (
            <LabelsUpgradeMessage
              message={outcome.text}
              upgradeUrl={outcome.upgradeUrl}
            />
          ) : (
            outcome.text
          )}
        </p>
      )}
    </>
  );
}
