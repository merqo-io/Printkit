"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { removePrinter } from "./actions";

export type PrinterActionsProps = {
  locationId: string;
  boothRef: string;
  boothLabel: string;
  catalogId: string;
  connector: string;
};

type Pending = "remove" | "change" | null;

const PRIMARY: Record<string, string> = {
  cloud_poll: "Printer address",
  vendor_cloud: "Edit SN and KEY",
  bridge: "Open bridge mode",
};

/**
 * One action group per booth printer: the connector's main task stays
 * visible, the rest sit under "More" so a row is not a wall of buttons.
 */
export function PrinterActions(props: PrinterActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const location = encodeURIComponent(props.locationId);
  const setupHref = `/dashboard/printers/setup?location=${location}&model=${encodeURIComponent(props.catalogId)}`;
  const primaryHref =
    props.connector === "bridge"
      ? `/dashboard/bridge?booth=${encodeURIComponent(props.boothRef)}`
      : setupHref;
  const primaryLabel = PRIMARY[props.connector];

  const confirm = async () => {
    if (!pending || busy) return;
    const next = pending;
    setBusy(true);
    try {
      const result = await removePrinter(props.locationId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (next === "change") {
        router.push(`/dashboard/printers/new?location=${location}`);
      } else {
        toast.success("Printer removed");
        setPending(null);
        router.refresh();
      }
    } catch {
      toast.error("Could not remove the printer. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const confirmLabel =
    pending === "change" ? "Remove and choose another" : "Remove printer";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {primaryLabel && (
        <Button asChild variant="outline" size="sm">
          <Link href={primaryHref}>{primaryLabel}</Link>
        </Button>
      )}
      <details className="relative">
        <summary className="border-input hover:bg-accent inline-flex h-8 cursor-pointer list-none items-center rounded-md border px-3 text-sm font-medium pointer-coarse:h-10 [&::-webkit-details-marker]:hidden">
          More
        </summary>
        <div className="bg-popover absolute right-0 z-10 mt-1 flex min-w-48 flex-col gap-1 rounded-md border p-1 shadow-md">
          <Button asChild variant="ghost" size="sm" className="justify-start">
            <Link href={setupHref}>View setup steps</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="justify-start">
            <Link href={`/dashboard/printers/designer?location=${location}`}>
              Design label
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={() => setPending("change")}
          >
            Use a different printer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive justify-start"
            onClick={() => setPending("remove")}
          >
            Remove printer
          </Button>
        </div>
      </details>

      {pending && (
        <div
          role="alertdialog"
          aria-labelledby={`confirm-${props.locationId}`}
          className="bg-muted/50 mt-2 w-full space-y-3 rounded-md border p-4"
        >
          <p id={`confirm-${props.locationId}`} className="font-medium">
            {pending === "change"
              ? `Use a different printer for ${props.boothLabel}?`
              : `Remove the printer from ${props.boothLabel}?`}
          </p>
          <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
            <li>
              This printer is unpaired and its address or login stops working.
            </li>
            <li>
              Orders that arrive now wait for a new printer. They print once one
              is online, but only within 30 minutes of the order. After that
              they fail and can be reprinted from History.
            </li>
            {pending === "change" && (
              <li>You will pick the new printer next.</li>
            )}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={confirm}
              disabled={busy}
            >
              {busy ? "Working…" : confirmLabel}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPending(null)}
              disabled={busy}
            >
              Keep it
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
