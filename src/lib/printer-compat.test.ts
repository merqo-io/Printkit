import { createCanvas, loadImage } from "@napi-rs/canvas";
import { describe, expect, it, vi } from "vitest";

const logoPath =
  "20000000-0000-4000-8000-000000000002/20000000-0000-4000-8000-000000000003/20000000-0000-4000-8000-000000000004.png";
const store = vi.hoisted(() => ({ bytes: new Uint8Array() }));
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: async () => ({
    storage: {
      from: () => ({
        download: async () => ({
          data: new Blob([store.bytes as BlobPart]),
          error: null,
        }),
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { label: "Cart" } }) }),
      }),
    }),
  }),
}));

import { PRINTER_CATALOG } from "./printer-catalog";
import { renderJobForPrinter } from "./render-job";
import { mmToPx } from "./label-raster";
import { STICKER_SNAPSHOT_KEY } from "./render-sticker-label";
import { defaultStickerTemplate } from "./sticker-template";
import type { Json } from "./types";

const logo = {
  id: "20000000-0000-4000-8000-000000000001",
  kind: "logo" as const,
  path: logoPath,
  xMm: 3,
  yMm: 3,
  widthMm: 10,
  heightMm: 10,
};
const payload = {
  order_number: "001",
  customer_name: "Alex",
  item_name: "Kopi",
  item_options: "Hot",
  label_index: "1",
  label_total: "3",
  [STICKER_SNAPSHOT_KEY]: {
    ...defaultStickerTemplate,
    elements: [logo, ...defaultStickerTemplate.elements],
  },
} as Json;

// Feie prints its own markup, not this raster, so it is covered by the vendor-cloud tests.
const rasterPrinters = PRINTER_CATALOG.filter(
  (entry) => entry.connector !== "vendor_cloud",
);

describe.each(rasterPrinters.map((entry) => [entry.id, entry] as const))(
  "%s",
  (_id, entry) => {
    it("renders a text and logo design at the catalog size, 1-bit", async () => {
      const canvas = createCanvas(16, 16);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, 16, 16);
      store.bytes = new Uint8Array(canvas.toBuffer("image/png"));
      const printer = {
        catalog_id: entry.id,
        label_width_mm: entry.defaultLabelMm.width,
        label_height_mm: entry.defaultLabelMm.height,
      };
      const png = await renderJobForPrinter(payload, printer);
      const image = await loadImage(png);
      expect(image.width).toBe(mmToPx(entry.defaultLabelMm.width, entry.dpi));
      expect(image.height).toBe(mmToPx(entry.defaultLabelMm.height, entry.dpi));
      const out = createCanvas(image.width, image.height);
      const outCtx = out.getContext("2d");
      outCtx.drawImage(image, 0, 0);
      const data = outCtx.getImageData(0, 0, image.width, image.height).data;
      const shades = new Set<number>();
      for (let i = 0; i < data.length; i += 4) shades.add(data[i]);
      expect([...shades].sort()).toEqual([0, 255]);
    });
  },
);
