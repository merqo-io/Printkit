import { Button } from "@merqo/ui/primitives";
import { JobStatusBadge } from "@/app/dashboard/job-status-badge";
import { examples } from "@/app/dashboard/printers/designer/sticker-content";
import type { PrintJobStatus } from "@/lib/print-jobs";

/** Strings lifted from the Bridge panel (`dashboard/bridge/bridge-panel.tsx`). */
export const PAIR_BUTTON = "Pair printer";
export const CONNECTING = "Connecting…";
export const CONNECTED = "Connected";
export const PRINT_TEST = "Print test";
export const PRINTING_SWITCH = "Printing";

const SCREEN = "flex h-full flex-col gap-3 p-3 text-left text-xs";

function PrintingRow() {
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden
        className="flex h-4 w-7 items-center rounded-full bg-primary p-0.5"
      >
        <span className="ml-auto size-3 rounded-full bg-primary-foreground" />
      </span>
      <span className="font-medium">{PRINTING_SWITCH}</span>
    </div>
  );
}

/** Frames: 0 "Pair printer", 1 "Connecting…", 2 "Connected" with "Print test". */
export function PairScreen({ frame }: { frame: number }) {
  return (
    <div className={SCREEN}>
      <PrintingRow />
      {frame === 0 ? (
        <Button
          size="sm"
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none min-h-11"
        >
          {PAIR_BUTTON}
        </Button>
      ) : null}
      {frame === 1 ? (
        <p className="text-muted-foreground">{CONNECTING}</p>
      ) : null}
      {frame >= 2 ? (
        <>
          <p className="text-success-text font-medium">{CONNECTED}</p>
          <Button
            size="sm"
            variant="outline"
            tabIndex={-1}
            aria-hidden
            className="pointer-events-none min-h-11"
          >
            {PRINT_TEST}
          </Button>
        </>
      ) : null}
    </div>
  );
}

/** One print job as the order lands, with the status the dashboard shows. */
export function JobScreen({
  status,
  showJob = true,
}: {
  status: PrintJobStatus;
  showJob?: boolean;
}) {
  return (
    <div className={SCREEN}>
      <PrintingRow />
      <p className="text-success-text font-medium">{CONNECTED}</p>
      {showJob ? (
        <div className="rounded-lg border p-2">
          <p className="font-medium">
            {examples.order_number} {examples.customer_name}
          </p>
          <p className="text-muted-foreground">{examples.item_name}</p>
          <div className="mt-2">
            <JobStatusBadge status={status} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The label as the designer's sample shows it. It keeps a real label's square
 * edge rather than the page's card radius.
 */
export function TicketLabel() {
  return (
    <div
      role="img"
      aria-label={`Label ${examples.order_number} ${examples.customer_name}, ${examples.item_name}`}
      className="border-foreground w-36 border-2 bg-white p-2 text-left text-xs leading-snug text-black"
    >
      <p className="text-base font-bold">{examples.order_number}</p>
      <p className="font-semibold">{examples.customer_name}</p>
      <p>{examples.item_name}</p>
      <p className="whitespace-pre-line">{examples.item_options}</p>
      <p className="mt-1 flex justify-between">
        <span>{examples.unit_position}</span>
        <span>{examples.booth_name}</span>
      </p>
    </div>
  );
}

/** Paper slot of a printer; the label slides out of it once printed. */
export function PrinterSlot({ printed }: { printed: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-muted rounded-lg border px-4 py-3 text-xs font-medium">
        Bluetooth printer
      </div>
      <div className="bg-foreground h-px w-32" />
      <div className="h-40 overflow-hidden">
        <div
          className={`transition-transform duration-700 motion-reduce:transition-none ${printed ? "translate-y-0" : "-translate-y-full"}`}
        >
          <TicketLabel />
        </div>
      </div>
    </div>
  );
}
