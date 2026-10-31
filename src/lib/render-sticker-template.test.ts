import { describe, expect, it } from "vitest";
import { defaultStickerTemplate } from "./sticker-template";
import { renderStickerTemplate } from "./render-sticker-template";
import { mmToPx } from "./label-raster";

describe("sticker template rendering", () => {
  it("renders the full sample to a monochrome PNG", () => {
    const result = renderStickerTemplate(defaultStickerTemplate, {
      order_number: "#001",
      unit_position: "1 / 3",
      item_name: "Kopi",
      item_options: "O (black)\nHot\nNormal sugar",
      customer_name: "Alex",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.png.subarray(1, 4).toString()).toBe("PNG");
  });
  it("reports the exact field when preparation text cannot fit", () => {
    const result = renderStickerTemplate(defaultStickerTemplate, {
      item_options: "verylongunbreakableoption".repeat(20),
    });
    expect(result).toEqual({
      ok: false,
      error: "text_overflow",
      elementId: defaultStickerTemplate.elements[3].id,
    });
  });
  it("wraps unspaced multilingual text when the field can hold it", () => {
    const element = {
      ...defaultStickerTemplate.elements[3],
      widthMm: 20,
      heightMm: 23,
    };
    const result = renderStickerTemplate(
      { ...defaultStickerTemplate, elements: [element] },
      { item_options: "无糖少冰燕麦奶加珍珠" },
    );
    expect(result.ok).toBe(true);
  });
  it("skips a logo with no decoded image instead of failing", () => {
    const logo = {
      id: "20000000-0000-4000-8000-000000000001",
      kind: "logo",
      path: "20000000-0000-4000-8000-000000000002/20000000-0000-4000-8000-000000000003/20000000-0000-4000-8000-000000000004.png",
      xMm: 3,
      yMm: 3,
      widthMm: 10,
      heightMm: 10,
    };
    expect(
      renderStickerTemplate({ ...defaultStickerTemplate, elements: [logo] }, {})
        .ok,
    ).toBe(true);
  });
  it("scales the design to fit a larger label, centered", () => {
    const result = renderStickerTemplate(
      defaultStickerTemplate,
      { order_number: "#001" },
      203,
      { overflow: "fit", fitTo: { widthMm: 100, heightMm: 60 } },
    );
    expect(result.ok && result.png.readUInt32BE(16)).toBe(mmToPx(100, 203));
    expect(result.ok && result.png.readUInt32BE(20)).toBe(mmToPx(60, 203));
  });
});
