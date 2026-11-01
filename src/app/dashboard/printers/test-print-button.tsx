"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { sendTestPrint } from "./actions";

type Outcome = { tone: "ok" | "error"; text: string } | null;

/**
 * Sends one sample label to a booth's printer. Shared by the Printers page
 * rows and the setup wizard's connected state; the message sits inline so the
 * vendor sees the result next to the button they pressed.
 */
export function TestPrintButton({
  locationId,
  size = "sm",
}: {
  locationId: string;
  size?: "sm" | "default";
}) {
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
          : { tone: "error", text: result.error },
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
      <Button variant="outline" size={size} onClick={send} disabled={busy}>
        {busy ? "Sending…" : "Print test label"}
      </Button>
      {outcome && (
        <p
          role={outcome.tone === "error" ? "alert" : "status"}
          className={
            outcome.tone === "error"
              ? "text-destructive w-full text-sm"
              : "text-success-text w-full text-sm"
          }
        >
          {outcome.text}
        </p>
      )}
    </>
  );
}
