"use client";

import { useState } from "react";
import { usePolling } from "@merqo/ui";
import { readPrinterState } from "./actions";
import { TestPrintButton } from "../test-print-button";

export { Step, Steps } from "@/components/steps";

const POLL_MS = 4000;

/**
 * Waits for the printer to say hello, so a vendor sees the connection land
 * instead of refreshing and guessing.
 */
export function WaitingForPrinter({ locationId }: { locationId: string }) {
  const [state, setState] = useState<"online" | "offline" | "not_set_up">(
    "not_set_up",
  );

  usePolling(
    async () => {
      try {
        setState(await readPrinterState(locationId));
      } catch (err: unknown) {
        console.error("Could not read the printer state", err);
      }
    },
    { intervalMs: POLL_MS, enabled: state !== "online" },
  );

  if (state === "online") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p role="status" className="text-success-text text-sm font-medium">
          Connected. Your next order will print here.
        </p>
        <TestPrintButton locationId={locationId} />
      </div>
    );
  }
  return (
    <p role="status" className="text-muted-foreground text-sm">
      Waiting for your printer to connect. This page updates by itself.
    </p>
  );
}
