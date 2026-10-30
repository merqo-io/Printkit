import type { SupabaseClient } from "@supabase/supabase-js";
import type { IncidentKind, VendorActivityPayload } from "@merqo/ui/contracts";
import type { Database } from "@/lib/types";

export type ServiceClient = SupabaseClient<Database, "printkit">;
export type Incident = NonNullable<VendorActivityPayload["incidents"]>[number];
export type RecentIncident = NonNullable<
  VendorActivityPayload["recent"]
>[number];

/** Kinds printkit writes; must match the ops_events check constraint. */
export type OpsEventKind = Extract<
  IncidentKind,
  "print_failed" | "webhook_rejected"
>;

export type OpsEvent = {
  vendorId: string;
  kind: OpsEventKind;
  ref: string;
  code: string;
};

export const STUCK_AFTER_MS = 600_000;
const MAX_FIELD = 64;
const RECENT_LIMIT = 10;
// Row caps keep one vendor's summary bounded; counts saturate at these.
const EVENTS_READ_LIMIT = 1000;
const STUCK_READ_LIMIT = 200;

/** Appends one failure row. Never throws, so a failing request keeps its own error. */
export async function recordOpsEvent(
  supabase: ServiceClient,
  e: OpsEvent,
): Promise<void> {
  try {
    const { error } = await supabase.from("ops_events").insert({
      vendor_id: e.vendorId,
      kind: e.kind,
      ref: e.ref.slice(0, MAX_FIELD),
      code: e.code.slice(0, MAX_FIELD),
    });
    if (error) {
      console.error("ops_events insert failed", error.code ?? "unknown");
    }
  } catch {
    console.error("ops_events insert failed", "exception");
  }
}

type StuckRow = {
  id: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  requeued_at: string | null;
};

function stuckIncident(row: StuckRow, cutoffMs: number): RecentIncident | null {
  const sent = row.status === "sent";
  const at = sent
    ? (row.sent_at ?? row.created_at)
    : (row.requeued_at ?? row.created_at);
  if (Date.parse(at) >= cutoffMs) return null;
  return {
    kind: "print_stuck",
    ref: row.id,
    code: sent ? "not_confirmed" : "not_claimed",
    at,
  };
}

async function readStuckJobs(
  supabase: ServiceClient,
  vendorId: string,
  nowMs: number,
): Promise<RecentIncident[]> {
  const cutoffMs = nowMs - STUCK_AFTER_MS;
  const { data, error } = await supabase
    .from("print_jobs")
    .select("id, status, created_at, sent_at, requeued_at")
    .eq("vendor_id", vendorId)
    .in("status", ["queued", "sent"])
    .lt("created_at", new Date(cutoffMs).toISOString())
    .order("created_at", { ascending: false })
    .limit(STUCK_READ_LIMIT);
  if (error) throw new Error(`print_jobs read failed: ${error.message}`);
  return ((data ?? []) as StuckRow[])
    .map((row) => stuckIncident(row, cutoffMs))
    .filter((r): r is RecentIncident => r !== null);
}

async function readEvents(
  supabase: ServiceClient,
  vendorId: string,
  sinceMs: number,
): Promise<RecentIncident[]> {
  const { data, error } = await supabase
    .from("ops_events")
    .select("kind, ref, code, created_at")
    .eq("vendor_id", vendorId)
    .gte("created_at", new Date(sinceMs).toISOString())
    .order("created_at", { ascending: false })
    .limit(EVENTS_READ_LIMIT);
  if (error) throw new Error(`ops_events read failed: ${error.message}`);
  return (
    (data ?? []) as {
      kind: OpsEventKind;
      ref: string;
      code: string;
      created_at: string;
    }[]
  ).map((r) => ({ kind: r.kind, ref: r.ref, code: r.code, at: r.created_at }));
}

/** Logged failures in the window plus currently stuck jobs; throws on a failed read. */
export async function summarizeIncidents(
  supabase: ServiceClient,
  vendorId: string,
  sinceHours = 72,
  nowMs = Date.now(),
): Promise<{ incidents: Incident[]; recent: RecentIncident[] }> {
  const [events, stuck] = await Promise.all([
    readEvents(supabase, vendorId, nowMs - sinceHours * 3_600_000),
    readStuckJobs(supabase, vendorId, nowMs),
  ]);
  const all = [...events, ...stuck].sort(
    (a, b) => Date.parse(b.at) - Date.parse(a.at),
  );

  const byKind = new Map<IncidentKind, Incident>();
  for (const r of all) {
    const existing = byKind.get(r.kind);
    if (existing) existing.count++;
    else byKind.set(r.kind, { kind: r.kind, count: 1, lastAt: r.at });
  }

  return {
    incidents: [...byKind.values()],
    recent: all.slice(0, RECENT_LIMIT),
  };
}
