import { describe, expect, it, vi } from "vitest";
import { defaultStickerTemplate } from "./sticker-template";
import {
  renderSnapshotLabel,
  STICKER_SNAPSHOT_KEY,
} from "./render-sticker-label";
import { renderJobForPrinter } from "./render-job";
import { renderStickerTemplate } from "./render-sticker-template";
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
  it("renders at the template size when the job carries a snapshot", async () => {
    const png = await renderJobForPrinter(
      { ...base, [STICKER_SNAPSHOT_KEY]: defaultStickerTemplate } as Json,
      printer,
    );
    expect(size(png)).toEqual({
      width: mmToPx(defaultStickerTemplate.widthMm, 203),
      height: mmToPx(defaultStickerTemplate.heightMm, 203),
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

  it("falls back when the snapshot has a logo, which is not rendered yet", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const logo = {
      id: "20000000-0000-4000-8000-000000000001",
      kind: "logo",
      assetId: "20000000-0000-4000-8000-000000000002",
      xMm: 3,
      yMm: 3,
      widthMm: 10,
      heightMm: 10,
    };
    const payload = {
      ...base,
      [STICKER_SNAPSHOT_KEY]: { ...defaultStickerTemplate, elements: [logo] },
    } as Json;
    expect(renderSnapshotLabel(payload, 203)).toBeNull();
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
