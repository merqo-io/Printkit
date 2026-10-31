"use server";

import { z } from "zod";
import { getVendorSession } from "@/lib/vendor-session";
import {
  logoPathSchema,
  stickerTemplateSchema,
  type StickerTemplate,
} from "@/lib/sticker-template";
import { getCatalogEntry } from "@/lib/printer-catalog";
import { renderStickerTemplate } from "@/lib/render-sticker-template";
// eslint-disable-next-line no-restricted-imports -- vendor and booth ownership are verified before the service-only save RPC
import { createServiceClient } from "@/lib/supabase/server";
import { rateLimit, RATE_WINDOW_SECONDS } from "@/lib/rate-limit";
import type { Json } from "@/lib/types";
import {
  inspectLogo,
  LOGO_BUCKET,
  LOGO_MAX_BYTES,
  LOGO_MAX_PIXELS,
  LOGO_URL_SECONDS,
} from "./logo-image";

const uploadSchema = z.object({
  locationId: z.uuid(),
  file: z.instanceof(File),
});
type LogoResult =
  { ok: true; path: string; url: string } | { ok: false; error: string };

export async function uploadStickerLogo(
  formData: FormData,
): Promise<LogoResult> {
  const input = uploadSchema.safeParse({
    locationId: formData.get("locationId"),
    file: formData.get("file"),
  });
  if (!input.success) return { ok: false, error: "Choose a logo file." };
  const { locationId, file } = input.data;
  if (file.size > LOGO_MAX_BYTES)
    return { ok: false, error: "The logo must be 512 KB or smaller." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const image = inspectLogo(bytes);
  if (!image) return { ok: false, error: "The logo must be a PNG or JPEG." };
  if (
    image.width < 1 ||
    image.height < 1 ||
    image.width > LOGO_MAX_PIXELS ||
    image.height > LOGO_MAX_PIXELS
  )
    return {
      ok: false,
      error: `The logo must be at most ${LOGO_MAX_PIXELS} by ${LOGO_MAX_PIXELS} pixels.`,
    };
  const { user, supabase } = await getVendorSession();
  const { data: booth, error: boothError } = await supabase
    .from("print_locations")
    .select("id")
    .eq("id", locationId)
    .eq("vendor_id", user.id)
    .eq("active", true)
    .maybeSingle();
  if (boothError || !booth)
    return { ok: false, error: "That booth is not available." };
  const service = await createServiceClient();
  if (
    !(await rateLimit(
      service,
      `sticker-logo:${user.id}`,
      10,
      RATE_WINDOW_SECONDS,
    ))
  )
    return {
      ok: false,
      error: "Too many uploads. Wait a moment and try again.",
    };
  const path = `${user.id}/${locationId}/${crypto.randomUUID()}.${image.ext}`;
  const { error: uploadError } = await service.storage
    .from(LOGO_BUCKET)
    .upload(path, bytes, { contentType: image.contentType, upsert: false });
  if (uploadError)
    return { ok: false, error: "Could not upload the logo. Please try again." };
  const { data: signed } = await service.storage
    .from(LOGO_BUCKET)
    .createSignedUrl(path, LOGO_URL_SECONDS);
  if (!signed?.signedUrl) {
    await service.storage.from(LOGO_BUCKET).remove([path]);
    return { ok: false, error: "Could not upload the logo. Please try again." };
  }
  return { ok: true, path, url: signed.signedUrl };
}

// Saved designs are immutable snapshots, so a logo any saved version still uses is kept;
// `kept` tells the client the file survived so it does not assume deletion.
export async function removeStickerLogo(
  locationId: string,
  path: string,
): Promise<{ ok: true; kept: boolean } | { ok: false; error: string }> {
  const location = z.uuid().safeParse(locationId);
  const logo = logoPathSchema.safeParse(path);
  if (!location.success || !logo.success)
    return { ok: false, error: "That logo is not available." };
  const { user, supabase } = await getVendorSession();
  if (!logo.data.startsWith(`${user.id}/${location.data}/`))
    return { ok: false, error: "That logo is not available." };
  const { data: used, error: usedError } = await supabase
    .from("sticker_templates")
    .select("id")
    .eq("location_id", location.data)
    .contains("design", { elements: [{ path: logo.data }] })
    .limit(1);
  if (usedError)
    return { ok: false, error: "Could not remove the logo. Please try again." };
  if (used.length) return { ok: true, kept: true };
  const service = await createServiceClient();
  const { error } = await service.storage.from(LOGO_BUCKET).remove([logo.data]);
  if (error)
    return { ok: false, error: "Could not remove the logo. Please try again." };
  return { ok: true, kept: false };
}

async function logosStored(
  service: Awaited<ReturnType<typeof createServiceClient>>,
  paths: string[],
): Promise<boolean> {
  const found = await Promise.all(
    paths.map(async (path) => {
      const slash = path.lastIndexOf("/");
      const { data, error } = await service.storage
        .from(LOGO_BUCKET)
        .list(path.slice(0, slash), {
          search: path.slice(slash + 1),
          limit: 5,
        });
      return (
        !error && !!data?.some((file) => file.name === path.slice(slash + 1))
      );
    }),
  );
  return found.every(Boolean);
}

function printerWidthError(catalogId: string, widthMm: number): string | null {
  const model = getCatalogEntry(catalogId);
  if (!model) return "The printer model is not supported.";
  if (widthMm < model.labelWidthMm.min || widthMm > model.labelWidthMm.max)
    return `This printer supports sticker widths from ${model.labelWidthMm.min} to ${model.labelWidthMm.max} mm.`;
  return null;
}

// Logos never overflow text, so the fit check renders without them.
function sampleFits(design: StickerTemplate): boolean {
  return renderStickerTemplate(design, {
    order_number: `#${"001"}`,
    customer_name: "Alex",
    item_name: "Kopi",
    item_options: "O (black)\nHot\nNormal sugar",
    unit_position: "1 / 3",
    booth_name: "Kopitiam Cart",
  }).ok;
}

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
  const { user, supabase } = await getVendorSession();
  const logoPaths = design.data.elements.flatMap((element) =>
    element.kind === "logo" ? [element.path] : [],
  );
  const logoPrefix = `${user.id}/${location.data}/`;
  if (logoPaths.some((path) => !path.startsWith(logoPrefix)))
    return { ok: false, error: "That logo is not available for this booth." };
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
  const widthError = printer
    ? printerWidthError(printer.catalog_id, design.data.widthMm)
    : null;
  if (widthError) return { ok: false, error: widthError };
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
  if (!(await logosStored(service, logoPaths)))
    return { ok: false, error: "That logo is not available for this booth." };
  if (!sampleFits(design.data))
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
