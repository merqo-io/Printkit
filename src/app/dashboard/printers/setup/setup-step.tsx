"use client";

import { useEffect, useState } from "react";
import { readPrinterState } from "./actions";

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

  useEffect(() => {
    let active = true;
    const check = () => {
      readPrinterState(locationId)
        .then((next) => {
          if (active) setState(next);
        })
        .catch((err: unknown) => {
          console.error("Could not read the printer state", err);
        });
    };
    check();
    const timer = setInterval(check, POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [locationId]);

  if (state === "online") {
    return (
      <p role="status" className="text-success-text text-sm font-medium">
        Connected. Your next order will print here.
      </p>
    );
  }
  return (
    <p role="status" className="text-muted-foreground text-sm">
      Waiting for your printer to connect. This page updates by itself.
    </p>
  );
}
