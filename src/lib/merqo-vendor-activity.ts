import type { VendorActivityPayload } from "@merqo/ui/contracts";
import type { Incident, RecentIncident } from "@/lib/ops-events";

export type PrintStats = {
  printerCount: number;
  jobs30d: number;
  failed30d: number;
  lastJobAt: string | null;
};

export type IncidentSummary = {
  incidents: Incident[];
  recent: RecentIncident[];
};

const ATTENTION_FAILURE_RATE = 0.2;

function status(
  stats: PrintStats,
  summary: IncidentSummary | null,
): VendorActivityPayload["status"] {
  if (stats.printerCount === 0) return null;
  if (summary?.incidents.some((i) => i.kind === "print_stuck")) return "stuck";
  if (
    stats.failed30d > 0 &&
    stats.failed30d >= stats.jobs30d * ATTENTION_FAILURE_RATE
  )
    return "attention";
  if (stats.lastJobAt === null) return "new";
  if (stats.jobs30d === 0) return "quiet";
  return "healthy";
}

/** printkit has no paid tier, so `plan` is null; `active` means a printer is set up. */
export function computeVendorActivity(
  stats: PrintStats,
  summary: IncidentSummary | null,
): VendorActivityPayload {
  const extras = summary
    ? { incidents: summary.incidents, recent: summary.recent }
    : {};
  if (stats.printerCount === 0 && stats.lastJobAt === null) {
    return {
      active: false,
      plan: null,
      status: null,
      metrics: [],
      lastActivityAt: null,
      ...extras,
    };
  }

  const ratePct =
    stats.jobs30d > 0 ? (stats.failed30d / stats.jobs30d) * 100 : 0;
  return {
    active: stats.printerCount > 0,
    plan: null,
    status: status(stats, summary),
    metrics: [
      { label: "Printers", value: String(stats.printerCount) },
      { label: "Print jobs (30d)", value: String(stats.jobs30d) },
      { label: "Failure rate (30d)", value: `${ratePct.toFixed(0)}%` },
    ],
    lastActivityAt: stats.lastJobAt,
    ...extras,
  };
}
