import { describe, expect, it } from "vitest";
import {
  defaultStickerTemplate,
  stickerTemplateSchema,
} from "./sticker-template";

describe("sticker templates", () => {
  it("accepts the 40 mm across by 60 mm feed default", () => {
    expect(stickerTemplateSchema.parse(defaultStickerTemplate)).toMatchObject({
      widthMm: 40,
      heightMm: 60,
    });
  });
  it("rejects fields outside the printable margin", () => {
    const first = defaultStickerTemplate.elements[0];
    expect(
      stickerTemplateSchema.safeParse({
        ...defaultStickerTemplate,
        elements: [{ ...first, xMm: 30 }],
      }).success,
    ).toBe(false);
  });
  it("rejects repeated IDs and invalid dimensions", () => {
    const first = defaultStickerTemplate.elements[0];
    expect(
      stickerTemplateSchema.safeParse({
        ...defaultStickerTemplate,
        elements: [first, first],
      }).success,
    ).toBe(false);
    expect(
      stickerTemplateSchema.safeParse({
        ...defaultStickerTemplate,
        widthMm: NaN,
      }).success,
    ).toBe(false);
  });
  it("accepts only a bounded asset identifier, not an external logo URL", () => {
    const logo = {
      id: "20000000-0000-4000-8000-000000000001",
      kind: "logo",
      assetId: "20000000-0000-4000-8000-000000000002",
      xMm: 3,
      yMm: 3,
      widthMm: 10,
      heightMm: 10,
    };
    expect(
      stickerTemplateSchema.safeParse({
        ...defaultStickerTemplate,
        elements: [logo],
      }).success,
    ).toBe(true);
    expect(
      stickerTemplateSchema.safeParse({
        ...defaultStickerTemplate,
        elements: [{ ...logo, assetId: "https://example.invalid/logo" }],
      }).success,
    ).toBe(false);
  });
});
