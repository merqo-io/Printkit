"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@merqo/ui";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@merqo/ui/primitives";
import { toast } from "sonner";
import { removePrinter } from "./actions";
import { TestPrintButton } from "./test-print-button";

export type PrinterActionsProps = {
  locationId: string;
  boothRef: string;
  boothLabel: string;
  catalogId: string;
  connector: string;
  offline?: boolean;
};

type Pending = "remove" | "change" | null;

// Coarse pointers get the 44px touch target the rest of the page uses.
const ITEM = "pointer-coarse:h-11";

const PRIMARY: Record<string, string> = {
  cloud_poll: "Printer address",
  vendor_cloud: "Edit serial and key",
  bridge: "Connect a Bluetooth printer",
};

/**
 * One action group per booth printer: the connector's main task stays
 * visible, the rest sit under "More" so a row is not a wall of buttons.
 */
export function PrinterActions(props: PrinterActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const location = encodeURIComponent(props.locationId);
  const setupHref = `/dashboard/printers/setup?location=${location}&model=${encodeURIComponent(props.catalogId)}`;
  const primaryHref =
    props.connector === "bridge"
      ? `/dashboard/bridge?booth=${encodeURIComponent(props.boothRef)}`
      : setupHref;
  const primaryLabel = PRIMARY[props.connector];

  const ask = (kind: Exclude<Pending, null>) => {
    setPending(kind);
  };

  const cancel = () => setPending(null);

  // Focus returns to "More" once the dialog has closed; doing it earlier is
  // undone by the dialog's focus trap.
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && pending === null) triggerRef.current?.focus();
    wasPending.current = pending !== null;
  }, [pending]);

  // Throwing keeps the shared dialog open with the message, so a failed
  // removal can be retried without reopening it.
  const confirm = async () => {
    if (!pending) return;
    const next = pending;
    let result;
    try {
      result = await removePrinter(props.locationId);
    } catch {
      throw new Error("Could not remove the printer. Please try again.");
    }
    if (!result.ok) throw new Error(result.error);
    if (next === "change") {
      router.push(`/dashboard/printers/new?location=${location}`);
    } else {
      toast.success("Printer removed");
      router.refresh();
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
      <TestPrintButton locationId={props.locationId} offline={props.offline} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            size="sm"
            className="pointer-coarse:h-11"
          >
            More
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem asChild className={ITEM}>
            <Link href={setupHref}>View setup steps</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={ITEM}>
            <Link href={`/dashboard/printers/designer?location=${location}`}>
              Design label
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM} onSelect={() => ask("change")}>
            Use a different printer
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            className={ITEM}
            onSelect={() => ask("remove")}
          >
            Remove printer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) cancel();
        }}
        title={
          pending === "change"
            ? `Use a different printer for ${props.boothLabel}?`
            : `Remove the printer from ${props.boothLabel}?`
        }
        description="This printer will stop receiving orders. Orders still queued wait up to 30 minutes for a new printer."
        confirmLabel={confirmLabel}
        pendingLabel="Removing…"
        variant="destructive"
        onConfirm={confirm}
      />
    </div>
  );
}
