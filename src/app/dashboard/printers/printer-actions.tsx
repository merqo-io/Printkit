"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertDialog } from "radix-ui";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

const PRIMARY: Record<string, string> = {
  cloud_poll: "Printer address",
  vendor_cloud: "Edit serial and key",
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const location = encodeURIComponent(props.locationId);
  const setupHref = `/dashboard/printers/setup?location=${location}&model=${encodeURIComponent(props.catalogId)}`;
  const primaryHref =
    props.connector === "bridge"
      ? `/dashboard/bridge?booth=${encodeURIComponent(props.boothRef)}`
      : setupHref;
  const primaryLabel = PRIMARY[props.connector];

  // <details> only closes itself on a second click on its summary, so outside
  // clicks and Escape are handled here while it is open.
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      close();
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const ask = (kind: Exclude<Pending, null>) => {
    setMenuOpen(false);
    setPending(kind);
  };

  const cancel = () => {
    setPending(null);
    triggerRef.current?.focus();
  };

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
      <TestPrintButton locationId={props.locationId} offline={props.offline} />
      <details
        ref={menuRef}
        open={menuOpen}
        onToggle={(event) => setMenuOpen(event.currentTarget.open)}
        className="relative"
      >
        <summary
          ref={triggerRef}
          className="border-input hover:bg-accent inline-flex h-8 cursor-pointer list-none items-center rounded-md border px-3 text-sm font-medium pointer-coarse:h-11 [&::-webkit-details-marker]:hidden"
        >
          More
        </summary>
        <div className="bg-popover absolute right-0 z-10 mt-1 flex min-w-48 flex-col gap-1 rounded-md border p-1">
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
            onClick={() => ask("change")}
          >
            Use a different printer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive justify-start"
            onClick={() => ask("remove")}
          >
            Remove printer
          </Button>
        </div>
      </details>

      <AlertDialog.Root
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open && !busy) cancel();
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
          <AlertDialog.Content
            // The trigger lives in a menu that has just closed, so focus is
            // sent back to "More" by hand.
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              triggerRef.current?.focus();
            }}
            className="bg-background fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 space-y-3 rounded-md border p-5 shadow-lg"
          >
            <AlertDialog.Title className="font-medium">
              {pending === "change"
                ? `Use a different printer for ${props.boothLabel}?`
                : `Remove the printer from ${props.boothLabel}?`}
            </AlertDialog.Title>
            <AlertDialog.Description className="text-muted-foreground text-sm">
              This printer will stop receiving orders. Orders still queued wait
              up to 30 minutes for a new printer.
            </AlertDialog.Description>
            <div className="flex flex-wrap justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <Button variant="outline" size="sm" disabled={busy}>
                  Cancel
                </Button>
              </AlertDialog.Cancel>
              <Button
                variant="destructive"
                size="sm"
                onClick={confirm}
                disabled={busy}
              >
                {busy ? "Removing…" : confirmLabel}
              </Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
