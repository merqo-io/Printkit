import { createCanvas, loadImage } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import {
  decodeLogo,
  ditherToBitmap,
  drawLogoBitmap,
} from "./sticker-logo-bitmap";

function pixels(shade: number, count: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(count * 4);
  for (let i = 0; i < count; i++) data.set([shade, shade, shade, 255], i * 4);
  return data;
}

function encoded(
  width: number,
  height: number,
  type: "image/png" | "image/jpeg",
): Uint8Array {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, width, height);
  return new Uint8Array(canvas.toBuffer(type as "image/png"));
}

describe("ditherToBitmap", () => {
  it("keeps pure black and pure white exactly", () => {
    const black = pixels(0, 16);
    const white = pixels(255, 16);
    ditherToBitmap(black, 4, 4);
    ditherToBitmap(white, 4, 4);
    expect(new Set(black.filter((_, i) => i % 4 === 0))).toEqual(new Set([0]));
    expect(new Set(white.filter((_, i) => i % 4 === 0))).toEqual(
      new Set([255]),
    );
  });
  it("turns mid grey into a mix of black and white only", () => {
    const grey = pixels(128, 16);
    ditherToBitmap(grey, 4, 4);
    const values = grey.filter((_, i) => i % 4 === 0);
    expect(new Set(values)).toEqual(new Set([0, 255]));
    expect(values.filter((value) => value === 255)).toHaveLength(8);
  });
});

describe("decodeLogo", () => {
  it("decodes PNG and JPEG", async () => {
    expect(await decodeLogo(encoded(8, 4, "image/png"))).toMatchObject({
      width: 8,
      height: 4,
    });
    expect(await decodeLogo(encoded(8, 4, "image/jpeg"))).toMatchObject({
      width: 8,
      height: 4,
    });
  });
  it("rejects garbage, oversized bytes and oversized dimensions", async () => {
    expect(await decodeLogo(new Uint8Array([1, 2, 3]))).toBeNull();
    expect(await decodeLogo(new Uint8Array(600 * 1024))).toBeNull();
    expect(await decodeLogo(encoded(1100, 10, "image/png"))).toBeNull();
  });
  it("rejects a PNG whose body is truncated", async () => {
    const png = encoded(8, 8, "image/png");
    expect(await decodeLogo(png.slice(0, 40))).toBeNull();
  });
});

describe("drawLogoBitmap", () => {
  it("fits a wide logo inside a square box, centered, keeping aspect", async () => {
    const image = await loadImage(Buffer.from(encoded(40, 10, "image/png")));
    const canvas = createCanvas(30, 30);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 30, 30);
    drawLogoBitmap(ctx, image, { x: 5, y: 5, width: 20, height: 20 });
    const at = (x: number, y: number) => ctx.getImageData(x, y, 1, 1).data[0];
    expect(at(15, 15)).toBe(0);
    // Box rows above and below the 20 by 5 logo stay paper.
    expect(at(15, 6)).toBe(255);
    expect(at(15, 24)).toBe(255);
    expect(at(2, 2)).toBe(255);
  });
});
