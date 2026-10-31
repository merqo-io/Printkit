import { describe, expect, it } from "vitest";
import { inspectLogo } from "./logo-image";

function jpegWith(...segments: number[][]) {
  const sof = [
    0xff, 0xc0, 0, 17, 8, 0x01, 0x2c, 0x00, 0xc8, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ];
  return new Uint8Array([0xff, 0xd8, ...segments.flat(), ...sof]);
}

describe("inspectLogo", () => {
  it("reads JPEG size past a length-prefixed segment", () => {
    const app0 = [0xff, 0xe0, 0, 4, 0, 0];
    expect(inspectLogo(jpegWith(app0))).toMatchObject({
      ext: "jpg",
      width: 200,
      height: 300,
    });
  });
  it("skips stand-alone TEM and RSTn markers without reading a length", () => {
    // A length read here would swallow the frame header and miss the size.
    const markers = [
      [0xff, 0x01],
      [0xff, 0xd0],
      [0xff, 0xd7],
    ];
    expect(
      inspectLogo(jpegWith([0xff, 0xe0, 0, 4, 0, 0], ...markers)),
    ).toMatchObject({
      width: 200,
      height: 300,
    });
  });
  it("rejects a JPEG that starts scanning before any frame header", () => {
    expect(
      inspectLogo(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 4, 0, 0])),
    ).toBeNull();
  });
});
