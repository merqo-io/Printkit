import { buildLabelLayout } from "@/lib/label-layout";
import { rasterizeLayout } from "@/lib/label-raster";
import { renderSnapshotLabel } from "@/lib/render-sticker-label";
import { getCatalogEntry } from "@/lib/printer-catalog";
import type { PrinterRow } from "@/lib/printers";
import type { Json } from "@/lib/types";

/**
 * One label, rendered for one printer: built at that printer's configured
 * label size and rasterized at its model's dpi. Every device that prints a
 * raster image goes through here, so a Star printer, a NIIMBOT over
 * Bluetooth and the virtual printer all produce the same label. A job that
 * carries a saved sticker design renders from it at the design's own size;
 * otherwise (or if the design cannot render) the default layout is used.
 */
export async function renderJobForPrinter(
  payload: Json,
  printer: Pick<
    PrinterRow,
    "label_width_mm" | "label_height_mm" | "catalog_id"
  >,
): Promise<Buffer> {
  const dpi = getCatalogEntry(printer.catalog_id)?.dpi ?? 203;
  const designed = renderSnapshotLabel(payload, dpi);
  if (designed) return designed;
  const layout = buildLabelLayout(payload, {
    widthMm: Number(printer.label_width_mm),
    heightMm: Number(printer.label_height_mm),
  });
  return rasterizeLayout(layout, dpi);
}
