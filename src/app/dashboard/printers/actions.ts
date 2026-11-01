"use server";
import { revalidatePath } from "next/cache";
import { getVendorSession } from "@/lib/vendor-session";
import { getVendorCloudDriver } from "@/lib/connectors/vendor-cloud/drivers";
// eslint-disable-next-line no-restricted-imports -- RLS has no client policy for this write; the caller is verified first
import { createServiceClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/schemas";
import { dispatchJob } from "@/lib/job-dispatch";
import { printerState } from "@/lib/printers";
import { TEST_PRINT_SOURCE_KIT } from "@/lib/test-print";

export type RemovePrinterResult = { ok: true } | { ok: false; error: string };

/**
 * Unpairs a booth's printer. The read and the delete are scoped by vendor as
 * well as location, so a forged location id removes nothing. Device
 * credentials and pairing codes go with the row (on delete cascade); queued
 * jobs are keyed to the booth, not the printer, so they stay queued for the
 * next printer.
 */
export async function removePrinter(
  locationInput: string,
): Promise<RemovePrinterResult> {
  const parsed = uuidSchema.safeParse(locationInput);
  if (!parsed.success) {
    return { ok: false, error: "Check the details and try again." };
  }
  const { user } = await getVendorSession();
  const service = await createServiceClient();

  const { data: printer, error: readError } = await service
    .from("printers")
    .select("id, connector, catalog_id, driver, device_ref")
    .eq("location_id", parsed.data)
    .eq("vendor_id", user.id)
    .maybeSingle();
  if (readError) {
    console.error("removePrinter: read failed", readError.message);
    return { ok: false, error: "Could not remove the printer." };
  }
  if (!printer) {
    return { ok: false, error: "That booth has no printer to remove." };
  }

  // Frees the serial number in the maker's account so it can be added again.
  // Best effort: a maker outage must not leave the vendor stuck with a printer
  // they asked to remove.
  if (printer.connector === "vendor_cloud" && printer.device_ref) {
    try {
      await getVendorCloudDriver(printer.driver)?.unregisterPrinter(
        printer.device_ref,
      );
    } catch (err) {
      console.error("removePrinter: unregister failed", err);
    }
  }

  const { error } = await service
    .from("printers")
    .delete()
    .eq("id", printer.id)
    .eq("vendor_id", user.id);
  if (error) {
    console.error("removePrinter: delete failed", error.message);
    return { ok: false, error: "Could not remove the printer." };
  }

  try {
    const { error: auditError } = await service.from("admin_audit").insert({
      admin_id: user.id,
      action: "printer_removed",
      target_id: printer.id,
      detail: {
        location_id: parsed.data,
        connector: printer.connector,
        catalog_id: printer.catalog_id,
      },
    });
    if (auditError)
      console.error(
        "removePrinter: admin_audit insert failed",
        auditError.message,
      );
  } catch (err) {
    console.error("removePrinter: admin_audit insert rejected", err);
  }

  revalidatePath("/dashboard/printers");
  revalidatePath("/dashboard");
  return { ok: true };
}

export type SendTestPrintResult =
  { ok: true; offline: boolean } | { ok: false; error: string };

const TEST_PRINT_COOLDOWN_MS = 60_000;

/**
 * Queues one sample label for a booth's printer. It goes through the same
 * queue as real orders, so a label that prints proves the whole route works.
 * Ownership is re-derived from the session before the service-role write, and
 * a second test within a minute is refused so a double click cannot print a
 * stack of labels.
 */
export async function sendTestPrint(
  locationInput: string,
): Promise<SendTestPrintResult> {
  const parsed = uuidSchema.safeParse(locationInput);
  if (!parsed.success) {
    return { ok: false, error: "Check the details and try again." };
  }
  const { user } = await getVendorSession();
  const service = await createServiceClient();

  const { data: printer, error: readError } = await service
    .from("printers")
    .select("id, display_name, last_seen_at")
    .eq("location_id", parsed.data)
    .eq("vendor_id", user.id)
    .maybeSingle();
  if (readError) {
    console.error("sendTestPrint: printer read failed", readError.message);
    return { ok: false, error: "Could not send the test label." };
  }
  if (!printer) {
    return { ok: false, error: "That booth has no printer to test." };
  }

  const since = new Date(Date.now() - TEST_PRINT_COOLDOWN_MS).toISOString();
  const { data: recent, error: recentError } = await service
    .from("print_jobs")
    .select("id")
    .eq("vendor_id", user.id)
    .eq("location_id", parsed.data)
    .eq("source_kit", TEST_PRINT_SOURCE_KIT)
    .gte("created_at", since)
    .limit(1);
  if (recentError) {
    console.error("sendTestPrint: recent read failed", recentError.message);
    return { ok: false, error: "Could not send the test label." };
  }
  if (recent && recent.length > 0) {
    return {
      ok: false,
      error:
        "A test label was just sent. Wait a minute before sending another.",
    };
  }

  const { data: job, error: insertError } = await service
    .from("print_jobs")
    .insert({
      vendor_id: user.id,
      job_type: "label",
      source_kit: TEST_PRINT_SOURCE_KIT,
      source_ref: crypto.randomUUID(),
      location_id: parsed.data,
      payload: {
        customer_name: printer.display_name || "Test print",
        order_number: "TEST",
      },
    })
    .select("id")
    .single();
  if (insertError || !job) {
    console.error("sendTestPrint: insert failed", insertError?.message);
    return { ok: false, error: "Could not send the test label." };
  }

  // Push-based printers (4G) only receive a job when we send it; polling
  // printers pick it up on their own, so dispatch is a no-op for them.
  try {
    await dispatchJob(job.id);
  } catch (err) {
    console.error("sendTestPrint: dispatchJob failed", err);
  }

  try {
    const { error: auditError } = await service.from("admin_audit").insert({
      admin_id: user.id,
      action: "test_print_sent",
      target_id: job.id,
      detail: { location_id: parsed.data },
    });
    if (auditError)
      console.error(
        "sendTestPrint: admin_audit insert failed",
        auditError.message,
      );
  } catch (err) {
    console.error("sendTestPrint: admin_audit insert rejected", err);
  }

  revalidatePath("/dashboard/history");
  return { ok: true, offline: printerState(printer.last_seen_at) !== "online" };
}
