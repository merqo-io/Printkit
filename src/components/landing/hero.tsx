"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PhoneFrame, usePrefersReducedMotion } from "@merqo/ui";
import { Badge, Button } from "@merqo/ui/primitives";
import type { PrintJobStatus } from "@/lib/print-jobs";
import { CONTAINER } from "./rhythm";
import { JobScreen, PrinterSlot } from "./screens";

/** Frames: 0 idle, 1 order queued, 2 sent, 3 printed with the label out. */
const FINAL_FRAME = 3;
const FRAME_AT_MS = [500, 1400, 2300];
const STATUS_BY_FRAME: PrintJobStatus[] = [
  "queued",
  "queued",
  "sent",
  "printed",
];

const REPLAY =
  "inline-flex min-h-11 items-center justify-center rounded-lg border-[1.5px] border-border px-4 text-sm font-semibold transition-colors hover:bg-muted active:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Server render, no JavaScript and reduced motion all show the finished
 * frame. Only a client without a reduced-motion preference rewinds to frame 0
 * after mount and plays the order in.
 */
function useHeroPlay() {
  const reduced = usePrefersReducedMotion();
  const [frame, setFrame] = useState(FINAL_FRAME);
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const timers = [
      setTimeout(() => setFrame(0), 0),
      ...FRAME_AT_MS.map((ms, i) => setTimeout(() => setFrame(i + 1), ms)),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reduced, run]);
  return {
    frame,
    showReplay: !reduced && frame === FINAL_FRAME,
    replay: () => setRun((n) => n + 1),
  };
}

export function Hero() {
  const { frame, showReplay, replay } = useHeroPlay();
  return (
    <section
      className={`${CONTAINER} grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-2`}
    >
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline">In build</Badge>
          <p className="text-muted-foreground text-sm">
            Built, not yet tried with vendors.
          </p>
        </div>
        <p className="text-muted-foreground mt-4 font-mono text-xs tracking-widest uppercase">
          printkit · print companion for qkit booths
        </p>
        <h1 className="font-display mt-4 max-w-xl text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-5xl">
          Print qkit orders on a Bluetooth printer.
        </h1>
        <p className="text-muted-foreground mt-5 max-w-md text-lg">
          printkit turns each order from your qkit booth into a label. A
          Bluetooth printer needs a phone or laptop with Chrome beside it to
          carry each label across.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/login">
              Sign in
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#how">How it works</a>
          </Button>
        </div>
      </div>
      <div className="flex flex-col items-center gap-3 lg:items-end">
        <div className="flex items-start justify-center gap-4">
          <PhoneFrame
            label="Helper phone"
            size="small"
            className="h-[260px] w-[170px] max-w-full min-w-0 sm:w-[190px]"
          >
            <JobScreen status={STATUS_BY_FRAME[frame]} showJob={frame >= 1} />
          </PhoneFrame>
          <PrinterSlot printed={frame >= FINAL_FRAME} />
        </div>
        {showReplay ? (
          <button type="button" onClick={replay} className={REPLAY}>
            Replay
          </button>
        ) : null}
      </div>
    </section>
  );
}
