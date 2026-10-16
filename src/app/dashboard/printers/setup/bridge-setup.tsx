"use client";

import { useState } from "react";
import { useAsyncAction } from "@/hooks/use-async-action";
import Link from "next/link";
import { Notice } from "@/components/notice";
import { TextLink } from "@/components/text-link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InfoButton } from "@/components/info-button";
import { BLUETOOTH_WARNING } from "@/lib/printer-info-copy";
import { createBridgePairingCode } from "./actions";
import { Step, Steps, WaitingForPrinter } from "./setup-step";

export function BridgeSetup({
  locationId,
  boothRef,
}: {
  locationId: string;
  boothRef: string;
}) {
  const [helper, setHelper] = useState<"android" | "pi" | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const { pending: busy, run } = useAsyncAction();

  const onPairingCode = async () => {
    return run(async () => {
      try {
        const result = await createBridgePairingCode(locationId);

        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setCode(result.code);
      } catch {
        toast.error("Could not complete setup. Please try again.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <Notice tone="warning" title="Before you start">
        <p>{BLUETOOTH_WARNING}</p>
        <p>
          <TextLink href="/guides/bluetooth-printers">
            Read the Bluetooth guide
          </TextLink>
        </p>
      </Notice>

      <Steps>
        <Step number={1} title="Choose the helper device">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={helper === "android" ? "default" : "outline"}
              size="sm"
              onClick={() => setHelper("android")}
            >
              Android phone or laptop
            </Button>
            <Button
              variant={helper === "pi" ? "default" : "outline"}
              size="sm"
              onClick={() => setHelper("pi")}
            >
              Raspberry Pi
            </Button>
            <span className="ml-1 inline-flex">
              <InfoButton topic="helper_device" />
            </span>
          </div>
        </Step>

        {helper === "android" && (
          <Step number={2} title="Set that device up next to the printer">
            <p className="text-muted-foreground text-sm">
              Open printkit on it in Chrome, turn Bridge mode on and pair the
              printer. Keep the screen on and Battery Saver off. A Windows
              laptop or a Mac works here too. An iPad does not: Apple does not
              let websites use Bluetooth.
            </p>
            <Button asChild size="sm">
              <Link
                href={`/dashboard/bridge?booth=${encodeURIComponent(boothRef)}`}
              >
                Open bridge mode
              </Link>
            </Button>
          </Step>
        )}

        {helper === "pi" && (
          <Step number={2} title="Pair the Raspberry Pi">
            {code ? (
              <div className="space-y-2">
                <p className="font-mono text-2xl font-semibold tracking-widest">
                  {code}
                </p>
                <p className="text-muted-foreground text-sm">
                  Good for 10 minutes, and usable once. On the Pi, run:
                </p>
                <code className="bg-muted block rounded-md px-3 py-2 font-mono text-xs">
                  printkit-bridge pair {code}
                </code>
              </div>
            ) : (
              <Button onClick={onPairingCode} disabled={busy} size="sm">
                {busy ? "Working…" : "Show a pairing code"}
              </Button>
            )}
            <p className="text-muted-foreground text-sm">
              The guide has the install steps for the Pi.
            </p>
          </Step>
        )}

        <Step number={3} title="Check it is connected">
          <WaitingForPrinter locationId={locationId} />
        </Step>
      </Steps>
    </div>
  );
}
