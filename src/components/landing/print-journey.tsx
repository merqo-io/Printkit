"use client";

import { useRef, type ReactNode } from "react";
import { Journey, JourneyStep, PhoneFrame, useScrollPlay } from "@merqo/ui";
import type { PrintJobStatus } from "@/lib/print-jobs";
import { CONTAINER } from "./rhythm";
import { JobScreen, PairScreen, PrinterSlot } from "./screens";

const PHONE =
  "h-[236px] w-[165px] max-w-full min-w-0 sm:h-[260px] sm:w-[190px]";
const STAGE =
  "flex w-full flex-nowrap items-start justify-center gap-2 sm:gap-4";

/**
 * Scroll is the play head: it advances a step as the stage comes into view and
 * rewinds on the way up. Reduced motion, no JavaScript and the server render
 * all show the finished state.
 */
function Stage({
  steps,
  children,
}: {
  steps: number;
  children: (step: number) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const step = useScrollPlay(ref, steps);
  return (
    <div ref={ref} className={STAGE}>
      {children(step)}
    </div>
  );
}

const STATUS_BY_STEP: PrintJobStatus[] = ["queued", "sent", "printed"];

export function PrintJourney() {
  return (
    <div className="border-t">
      <div className={CONTAINER}>
        <Journey
          id="how"
          title="From pairing to printed, in three steps."
          className="max-w-none px-0"
        >
          <JourneyStep
            label="Pair"
            heading="Pair your printer."
            say="Put a phone or laptop with Chrome next to the printer. Open printkit, turn Printing on and tap Pair printer."
            stage={
              <Stage steps={2}>
                {(step) => (
                  <PhoneFrame
                    label="Helper phone"
                    size="small"
                    className={PHONE}
                  >
                    <PairScreen frame={step} />
                  </PhoneFrame>
                )}
              </Stage>
            }
          />
          <JourneyStep
            label="Order"
            heading="An order comes in from qkit."
            say="When you turn on printing for your booth in qkit, printkit queues each order as a print job."
            stage={
              <Stage steps={1}>
                {(step) => (
                  <PhoneFrame
                    label="Helper phone"
                    size="small"
                    className={PHONE}
                  >
                    <JobScreen status="queued" showJob={step >= 1} />
                  </PhoneFrame>
                )}
              </Stage>
            }
          />
          <JourneyStep
            label="Print"
            heading="The label prints."
            say="The helper passes the label to the printer over Bluetooth, and the job shows as Printed in your history."
            stage={
              <Stage steps={2}>
                {(step) => (
                  <>
                    <PhoneFrame
                      label="Helper phone"
                      size="small"
                      className={PHONE}
                    >
                      <JobScreen status={STATUS_BY_STEP[step]} />
                    </PhoneFrame>
                    <PrinterSlot printed={step >= 2} />
                  </>
                )}
              </Stage>
            }
          />
        </Journey>
      </div>
    </div>
  );
}
