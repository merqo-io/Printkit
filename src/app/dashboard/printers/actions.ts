"use server";
import { revalidatePath } from "next/cache";
import { getVendorSession } from "@/lib/vendor-session";
import { getVendorCloudDriver } from "@/lib/connectors/vendor-cloud/drivers";
// eslint-disable-next-line no-restricted-imports -- RLS has no client policy for this write; the caller is verified first
import { createServiceClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/schemas";

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
