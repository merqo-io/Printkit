import { buildLabelLayout } from "@/lib/label-layout";
import { rasterizeLayout } from "@/lib/label-raster";
import {
  needsBoothFallback,
  renderSnapshotLabel,
} from "@/lib/render-sticker-label";
import { getCatalogEntry } from "@/lib/printer-catalog";
import type { PrinterRow } from "@/lib/printers";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/types";

async function locationLabel(locationId: string): Promise<string> {
  try {
    const service = await createServiceClient();
    const { data } = await service
      .from("print_locations")
      .select("label")
      .eq("id", locationId)
      .maybeSingle();
    return data?.label ?? "";
  } catch (err) {
    console.error("location name lookup failed", err);
    return "";
  }
}

/**
 * One label, rendered for one printer: built at that printer's configured
 * label size and rasterized at its model's dpi. Every device that prints a
 * raster image goes through here, so a Star printer, a NIIMBOT over
 * Bluetooth and the virtual printer all produce the same label. A job that
 * carries a saved sticker design renders from it, scaled to fit the
 * printer's label size (contain, centered) when the sizes differ;
 * otherwise (or if the design cannot render) the default layout is used.
 */
export async function renderJobForPrinter(
  payload: Json,
  printer: Pick<
    PrinterRow,
    | "label_width_mm"
    | "label_height_mm"
    | "catalog_id"
    | "location_id"
    | "vendor_id"
  >,
): Promise<Buffer> {
  const dpi = getCatalogEntry(printer.catalog_id)?.dpi ?? 203;
  const widthMm = Number(printer.label_width_mm);
  const heightMm = Number(printer.label_height_mm);
  const sized =
    Number.isFinite(widthMm) &&
    Number.isFinite(heightMm) &&
    widthMm > 0 &&
    heightMm > 0;
  const designed = await renderSnapshotLabel(payload, {
    dpi,
    owner: { vendorId: printer.vendor_id, locationId: printer.location_id },
    fitTo: sized ? { widthMm, heightMm } : undefined,
    boothFallback: needsBoothFallback(payload)
      ? await locationLabel(printer.location_id)
      : "",
  });
  if (designed) return designed;
  const layout = buildLabelLayout(payload, { widthMm, heightMm });
  return rasterizeLayout(layout, dpi);
}
