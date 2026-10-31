import { createCanvas, loadImage } from "@napi-rs/canvas";
import { describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({
  files: new Map<string, Uint8Array>(),
  throwOnDownload: false,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: async () => ({
    storage: {
      from: () => ({
        download: async (path: string) => {
          if (storage.throwOnDownload) throw new Error("storage down");
          const bytes = storage.files.get(path);
          return bytes
            ? { data: new Blob([bytes as BlobPart]), error: null }
            : { data: null, error: { message: "not found" } };
        },
      }),
    },
  }),
}));

import { defaultStickerTemplate } from "./sticker-template";
import {
  needsBoothFallback,
  renderSnapshotLabel,
  STICKER_SNAPSHOT_KEY,
} from "./render-sticker-label";

const logo = {
  id: "20000000-0000-4000-8000-000000000001",
  kind: "logo" as const,
  path: "20000000-0000-4000-8000-000000000002/20000000-0000-4000-8000-000000000003/20000000-0000-4000-8000-000000000004.png",
  xMm: 3,
  yMm: 3,
  widthMm: 10,
  heightMm: 10,
};

function solidPng(width: number, height: number): Uint8Array {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, width, height);
  return new Uint8Array(canvas.toBuffer("image/png"));
}
import { renderJobForPrinter } from "./render-job";
import { joinLines, renderStickerTemplate } from "./render-sticker-template";
import { mmToPx } from "./label-raster";
import type { Json } from "./types";

const printer = {
  label_width_mm: 50,
  label_height_mm: 30,
  catalog_id: "unknown-model",
};
const base = {
  order_number: "001",
  customer_name: "Alex",
  item_name: "Kopi",
  item_options: "Hot",
  label_index: "1",
  label_total: "3",
  _printkit_label_batch: "v1",
};

function size(png: Buffer) {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

describe("live label rendering from the saved template", () => {
  it("renders at the printer label size, scaling a differently sized design", async () => {
    const png = await renderJobForPrinter(
      { ...base, [STICKER_SNAPSHOT_KEY]: defaultStickerTemplate } as Json,
      printer,
    );
    expect(size(png)).toEqual({
      width: mmToPx(50, 203),
      height: mmToPx(30, 203),
    });
  });

  it("renders at the design size when it matches the printer label", async () => {
    const png = await renderJobForPrinter(
      { ...base, [STICKER_SNAPSHOT_KEY]: defaultStickerTemplate } as Json,
      { ...printer, label_width_mm: 40, label_height_mm: 60 },
    );
    expect(size(png)).toEqual({
      width: mmToPx(40, 203),
      height: mmToPx(60, 203),
    });
  });

  it("falls back to the default label when there is no snapshot", async () => {
    const png = await renderJobForPrinter(base as Json, printer);
    expect(size(png)).toEqual({
      width: mmToPx(50, 203),
      height: mmToPx(30, 203),
    });
  });

  it("falls back when the snapshot is invalid", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const png = await renderJobForPrinter(
      { ...base, [STICKER_SNAPSHOT_KEY]: { version: 9 } } as Json,
      printer,
    );
    expect(size(png).width).toBe(mmToPx(50, 203));
  });

  it("renders the rest of the design when a logo is missing", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    storage.files.clear();
    const payload = {
      ...base,
      [STICKER_SNAPSHOT_KEY]: {
        ...defaultStickerTemplate,
        elements: [logo, ...defaultStickerTemplate.elements.slice(0, 1)],
      },
    } as Json;
    const png = await renderSnapshotLabel(payload, { dpi: 203 });
    expect(png).not.toBeNull();
    expect(
      spy.mock.calls.some((call) => call[0] === "sticker logo skipped"),
    ).toBe(true);
  });

  it("skips a logo that is not a real image", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    storage.files.set(logo.path, new Uint8Array([1, 2, 3, 4]));
    const payload = {
      ...base,
      [STICKER_SNAPSHOT_KEY]: { ...defaultStickerTemplate, elements: [logo] },
    } as Json;
    expect(await renderSnapshotLabel(payload, { dpi: 203 })).not.toBeNull();
  });

  it("does not fail when the storage download throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    storage.throwOnDownload = true;
    const payload = {
      ...base,
      [STICKER_SNAPSHOT_KEY]: { ...defaultStickerTemplate, elements: [logo] },
    } as Json;
    expect(await renderSnapshotLabel(payload, { dpi: 203 })).not.toBeNull();
    storage.throwOnDownload = false;
  });

  it("prints a stored logo as black pixels in its box", async () => {
    storage.files.set(logo.path, solidPng(20, 20));
    const payload = {
      ...base,
      [STICKER_SNAPSHOT_KEY]: { ...defaultStickerTemplate, elements: [logo] },
    } as Json;
    const png = await renderSnapshotLabel(payload, { dpi: 203 });
    expect(png).not.toBeNull();
    const image = await loadImage(png as Buffer);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const x = mmToPx(8, 203);
    const y = mmToPx(8, 203);
    expect(Array.from(ctx.getImageData(x, y, 1, 1).data.slice(0, 3))).toEqual([
      0, 0, 0,
    ]);
    expect(Array.from(ctx.getImageData(1, 1, 1, 1).data.slice(0, 3))).toEqual([
      255, 255, 255,
    ]);
  });
});

describe("booth name fallback", () => {
  const boothTemplate = {
    ...defaultStickerTemplate,
    elements: [
      {
        ...defaultStickerTemplate.elements[0],
        field: "booth_name" as const,
      },
    ],
  };
  const plain = { ...base, [STICKER_SNAPSHOT_KEY]: boothTemplate } as Json;

  it("asks for a fallback only when the design shows booth_name and the order has none", () => {
    expect(needsBoothFallback(plain)).toBe(true);
    expect(
      needsBoothFallback({ ...(plain as object), booth_name: "Cart" } as Json),
    ).toBe(false);
    expect(
      needsBoothFallback({
        ...base,
        [STICKER_SNAPSHOT_KEY]: defaultStickerTemplate,
      } as Json),
    ).toBe(false);
  });

  it("uses the location name, and prints nothing when there is none", async () => {
    const withName = await renderSnapshotLabel(plain, {
      dpi: 203,
      boothFallback: "Kopitiam Cart",
    });
    const without = await renderSnapshotLabel(plain, { dpi: 203 });
    const blank = await renderSnapshotLabel(plain, {
      dpi: 203,
      boothFallback: "   ",
    });
    expect(withName).not.toBeNull();
    expect(without?.equals(blank as Buffer)).toBe(true);
    expect(withName?.equals(without as Buffer)).toBe(false);
  });
});

describe("overflow on live orders", () => {
  const long = (text: string) =>
    renderStickerTemplate(
      defaultStickerTemplate,
      { item_options: text },
      203,
      "fit",
    );

  it("fits 240 characters of options without failing", () => {
    expect(
      long("Extra hot, less sugar, oat milk, ".repeat(8).slice(0, 240)).ok,
    ).toBe(true);
  });

  it("fits an unbreakable 240 character option", () => {
    expect(long("x".repeat(240)).ok).toBe(true);
  });

  it("fits 240 CJK characters without spaces", () => {
    expect(long("无糖少冰燕麦奶加珍珠".repeat(24)).ok).toBe(true);
  });

  it("fits emoji sequences without splitting them", () => {
    expect(long("👨‍👩‍👧‍👦".repeat(60)).ok).toBe(true);
  });

  it("does not fail for a long item name in a one-line box", () => {
    const result = renderStickerTemplate(
      defaultStickerTemplate,
      {
        item_name: "Iced brown sugar boba milk tea with cheese foam".repeat(5),
      },
      203,
      "fit",
    );
    expect(result.ok).toBe(true);
  });

  it("changes the output when text is truncated versus short", () => {
    const short = long("Hot");
    const huge = long("无糖少冰燕麦奶加珍珠".repeat(24));
    expect(short.ok && huge.ok && !short.png.equals(huge.png)).toBe(true);
  });

  it("still rejects in preview mode", () => {
    expect(
      renderStickerTemplate(defaultStickerTemplate, {
        item_options: "x".repeat(240),
      }),
    ).toMatchObject({ ok: false, error: "text_overflow" });
  });
});

describe("joinLines", () => {
  it("adds no space between CJK lines", () => {
    expect(joinLines("无糖少冰", "燕麦奶")).toBe("无糖少冰燕麦奶");
  });
  it("keeps a space between Latin lines", () => {
    expect(joinLines("oat milk", "extra hot")).toBe("oat milk extra hot");
  });
});

describe("snapshot fallback log", () => {
  it("names the order and label in the log", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await renderSnapshotLabel(
      {
        order_number: "042",
        label_index: "2",
        [STICKER_SNAPSHOT_KEY]: { version: 9 },
      } as Json,
      { dpi: 203 },
    );
    expect(spy.mock.calls.at(-1)?.[1]).toBe("order 042 label 2");
  });
});
