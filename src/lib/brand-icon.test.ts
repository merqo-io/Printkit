import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { oklchToHex, readTokens } from "../../test/color";
import {
  brandIcon,
  BRAND_INK,
  BRAND_MAGENTA,
  BRAND_PAPER,
} from "@/lib/brand-icon";

type BrandIconProps = {
  children: [string, { props: { style: { background: string } } }];
  style: {
    width: number;
    height: number;
    background: string;
    color: string;
    fontFamily: string;
    fontSize: number;
    borderRadius: number;
  };
};

function props(size: number): BrandIconProps {
  return brandIcon(size).props as BrandIconProps;
}

describe("brandIcon", () => {
  it("renders a paper 'P' on ink with a magenta dot", () => {
    const p = props(32);
    expect(p.children[0]).toBe("P");
    expect(p.style.background).toBe(BRAND_INK);
    expect(p.style.color).toBe(BRAND_PAPER);
    expect(p.children[1].props.style.background).toBe(BRAND_MAGENTA);
    expect(p.style.fontFamily).toBe("Georgia, 'Times New Roman', serif");
  });

  it("scales fontSize and borderRadius proportionally to the requested size", () => {
    const small = props(32);
    const large = props(180);
    expect(small.style.width).toBe(32);
    expect(small.style.height).toBe(32);
    expect(small.style.fontSize).toBeCloseTo(32 * 0.62);
    expect(small.style.borderRadius).toBeCloseTo(32 * 0.22);
    expect(large.style.fontSize).toBeCloseTo(180 * 0.62);
    expect(large.style.borderRadius).toBeCloseTo(180 * 0.22);
  });

  it("matches the light-theme tokens", () => {
    const css = readFileSync(
      path.join(__dirname, "../app/globals.css"),
      "utf8",
    );
    const t = readTokens(css, ":root");
    expect(oklchToHex(t.primary)).toBe(BRAND_INK);
    expect(oklchToHex(t.background)).toBe(BRAND_PAPER);
    expect(oklchToHex(t.magenta)).toBe(BRAND_MAGENTA);
  });
});
