import type { Image } from "@napi-rs/canvas";
import { LOGO_BUCKET } from "@/app/dashboard/printers/designer/logo-image";
import { decodeLogo } from "@/lib/sticker-logo-bitmap";
import {
  stickerTemplateSchema,
  type StickerTemplate,
} from "@/lib/sticker-template";
import { createServiceClient } from "@/lib/supabase/server";

export type LogoDownload = (path: string) => Promise<Uint8Array | null>;

async function downloadFromBucket(path: string): Promise<Uint8Array | null> {
  const service = await createServiceClient();
  const { data, error } = await service.storage
    .from(LOGO_BUCKET)
    .download(path);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

/**
 * Loads every logo a template uses. A logo that is missing, unreadable or
 * not a valid image is logged and left out, so the label still prints
 * without it; this never throws.
 */
export async function loadStickerLogos(
  template: StickerTemplate,
  download: LogoDownload = downloadFromBucket,
  context = "",
): Promise<Map<string, Image>> {
  const paths = new Set(
    template.elements.flatMap((element) =>
      element.kind === "logo" ? [element.path] : [],
    ),
  );
  const logos = new Map<string, Image>();
  await Promise.all(
    [...paths].map(async (path) => {
      try {
        const bytes = await download(path);
        const image = bytes ? await decodeLogo(bytes) : null;
        if (image) logos.set(path, image);
        else console.error("sticker logo skipped", context, path);
      } catch (err) {
        console.error("sticker logo failed", context, path, err);
      }
    }),
  );
  return logos;
}

export function parseStickerTemplate(input: unknown): StickerTemplate | null {
  const parsed = stickerTemplateSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}
