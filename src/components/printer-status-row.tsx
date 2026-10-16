import { cn, formatDateTime } from "@/lib/utils";

export type PrinterStatusRowProps = {
  label: string;
  printerName: string | null;
  state: "online" | "offline" | "not_set_up";
  lastSeenAt: string | null;
};

const TONE: Record<PrinterStatusRowProps["state"], string> = {
  online: "bg-success",
  offline: "bg-muted-foreground",
  not_set_up: "bg-warning",
};

function describe(props: PrinterStatusRowProps): string {
  if (props.state === "not_set_up") return "No printer yet";
  if (props.state === "online") return "Printer connected";
  return props.lastSeenAt
    ? `Offline since ${formatDateTime(props.lastSeenAt)}`
    : "Offline";
}

/**
 * One booth's printer, read from the shared last_seen_at health signal
 * rather than a live channel, so every connector reports the same way and
 * the page needs no client-side subscription.
 */
export function PrinterStatusRow(props: PrinterStatusRowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="font-medium">{props.label}</p>
        <p className="text-muted-foreground text-sm">
          {props.printerName ?? "No printer set up"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          aria-hidden
          className={cn("size-2.5 rounded-full", TONE[props.state])}
        />
        <span
          className={cn(
            "text-sm",
            props.state === "online"
              ? "text-success-text font-medium"
              : "text-muted-foreground",
          )}
        >
          {describe(props)}
        </span>
      </div>
    </div>
  );
}
