"use server";

import { z } from "zod";
import { getVendorSession } from "@/lib/vendor-session";
import { stickerTemplateSchema } from "@/lib/sticker-template";
import { getCatalogEntry } from "@/lib/printer-catalog";
import { renderStickerTemplate } from "@/lib/render-sticker-template";
// eslint-disable-next-line no-restricted-imports -- vendor and booth ownership are verified before the service-only save RPC
import { createServiceClient } from "@/lib/supabase/server";
import { rateLimit, RATE_WINDOW_SECONDS } from "@/lib/rate-limit";
import type { Json } from "@/lib/types";

export async function saveStickerDesign(
  locationId: string,
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const location = z.uuid().safeParse(locationId);
  const design = stickerTemplateSchema.safeParse(input);
  if (!location.success || !design.success)
    return {
      ok: false,
      error: "Check the sticker dimensions and field positions.",
    };
  if (design.data.elements.some((element) => element.kind === "logo"))
    return { ok: false, error: "Logo uploads are not available yet." };
  const { user, supabase } = await getVendorSession();
  const { data: booth, error: boothError } = await supabase
    .from("print_locations")
    .select("id")
    .eq("id", location.data)
    .eq("vendor_id", user.id)
    .eq("active", true)
    .maybeSingle();
  if (boothError || !booth)
    return { ok: false, error: "That booth is not available." };
  const { data: printer, error: printerError } = await supabase
    .from("printers")
    .select("catalog_id")
    .eq("location_id", location.data)
    .eq("vendor_id", user.id)
    .maybeSingle();
  if (printerError)
    return {
      ok: false,
      error: "Could not check your printer. Please try again.",
    };
  if (printer) {
    const model = getCatalogEntry(printer.catalog_id);
    if (!model)
      return { ok: false, error: "The printer model is not supported." };
    if (
      design.data.widthMm < model.labelWidthMm.min ||
      design.data.widthMm > model.labelWidthMm.max
    )
      return {
        ok: false,
        error: `This printer supports sticker widths from ${model.labelWidthMm.min} to ${model.labelWidthMm.max} mm.`,
      };
  }
  const service = await createServiceClient();
  if (
    !(await rateLimit(
      service,
      `sticker-save:${user.id}`,
      30,
      RATE_WINDOW_SECONDS,
    ))
  )
    return {
      ok: false,
      error: "Too many changes. Wait a moment and try again.",
    };
  const sample = renderStickerTemplate(design.data, {
    order_number: `#${"001"}`,
    customer_name: "Alex",
    item_name: "Kopi",
    item_options: "O (black)\nHot\nNormal sugar",
    unit_position: "1 / 3",
    booth_name: "Kopitiam Cart",
  });
  if (!sample.ok)
    return {
      ok: false,
      error:
        "Some sample text does not fit. Enlarge its field or reduce the text size.",
    };
  const { error } = await service.rpc("save_sticker_template", {
    p_location_id: location.data,
    p_vendor_id: user.id,
    p_design: design.data as unknown as Json,
  });
  if (error)
    return {
      ok: false,
      error: "Could not save your design. Please try again.",
    };
  return { ok: true };
}
