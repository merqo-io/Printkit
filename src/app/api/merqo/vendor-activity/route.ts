import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { listAllUsers } from "@/lib/list-all-users";
import { bearerOk } from "@/lib/merqo-auth";
import {
  computeVendorActivity,
  type IncidentSummary,
  type PrintStats,
} from "@/lib/merqo-vendor-activity";
import { summarizeIncidents, type ServiceClient } from "@/lib/ops-events";

export const revalidate = 0;

const querySchema = z.object({ email: z.email() });
const WINDOW_MS = 30 * 86_400_000;

function upstreamUnavailable(message: string) {
  console.error("printkit vendor-activity: read failed", message);
  return NextResponse.json({ error: "Upstream unavailable" }, { status: 503 });
}

async function readStats(
  supabase: ServiceClient,
  vendorId: string,
  nowMs: number,
): Promise<{ error: string | null; stats: PrintStats }> {
  const since = new Date(nowMs - WINDOW_MS).toISOString();
  const [printers, jobs, failed, last] = await Promise.all([
    supabase
      .from("printers")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendorId),
    supabase
      .from("print_jobs")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendorId)
      .gte("created_at", since),
    supabase
      .from("print_jobs")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendorId)
      .gte("created_at", since)
      .eq("status", "failed"),
    supabase
      .from("print_jobs")
      .select("created_at")
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const error =
    printers.error ?? jobs.error ?? failed.error ?? last.error ?? null;
  return {
    error: error?.message ?? null,
    stats: {
      printerCount: printers.count ?? 0,
      jobs30d: jobs.count ?? 0,
      failed30d: failed.count ?? 0,
      lastJobAt: last.data?.created_at ?? null,
    },
  };
}

// A failed incident read drops only the optional incident fields.
async function readIncidents(
  supabase: ServiceClient,
  vendorId: string,
  nowMs: number,
): Promise<IncidentSummary | null> {
  try {
    return await summarizeIncidents(supabase, vendorId, 72, nowMs);
  } catch (err) {
    console.error(
      "printkit vendor-activity: incident read failed",
      err instanceof Error ? err.message : "unknown",
    );
    return null;
  }
}

export async function GET(request: Request) {
  if (!bearerOk(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    email: searchParams.get("email") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const usersRes = await listAllUsers(supabase);
  if (usersRes.error) return upstreamUnavailable(usersRes.error.message);

  const key = parsed.data.email.toLowerCase();
  const user = (usersRes.data?.users ?? []).find(
    (u) => u.email?.toLowerCase() === key,
  );
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const nowMs = Date.now();
  const [base, summary] = await Promise.all([
    readStats(supabase, user.id, nowMs),
    readIncidents(supabase, user.id, nowMs),
  ]);
  if (base.error) return upstreamUnavailable(base.error);

  return NextResponse.json(computeVendorActivity(base.stats, summary));
}
