import { describe, expect, it } from "vitest";
import {
  defaultStickerTemplate,
  stickerTemplateSchema,
} from "./sticker-template";

describe("logo cap", () => {
  const logoAt = (n: number) => ({
    id: `20000000-0000-4000-8000-00000000010${n}`,
    kind: "logo" as const,
    path: "20000000-0000-4000-8000-000000000002/20000000-0000-4000-8000-000000000003/20000000-0000-4000-8000-000000000004.png",
    xMm: 3,
    yMm: 3,
    widthMm: 5,
    heightMm: 5,
  });
  it("allows 4 logos and rejects 5", () => {
    const withLogos = (count: number) => ({
      ...defaultStickerTemplate,
      elements: Array.from({ length: count }, (_, n) => logoAt(n)),
    });
    expect(stickerTemplateSchema.safeParse(withLogos(4)).success).toBe(true);
    expect(stickerTemplateSchema.safeParse(withLogos(5)).success).toBe(false);
  });
});

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
  it("accepts only a bucket storage path, not an external logo URL", () => {
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
      stickerTemplateSchema.safeParse({
        ...defaultStickerTemplate,
        elements: [logo],
      }).success,
    ).toBe(true);
    expect(
      stickerTemplateSchema.safeParse({
        ...defaultStickerTemplate,
        elements: [{ ...logo, path: "https://example.invalid/logo.png" }],
      }).success,
    ).toBe(false);
  });
});
