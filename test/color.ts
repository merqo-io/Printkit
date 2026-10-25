export type Rgb = [number, number, number];

const OKLCH = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/;

const linearToSrgb = (c: number) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

/** Linear-light sRGB (unclamped) for an `oklch(L C H)` string. */
function oklchToLinear(value: string): Rgb {
  const m = OKLCH.exec(value.trim());
  if (!m) throw new Error(`Not an oklch() colour: ${value}`);
  const [L, C, h] = [
    Number(m[1]),
    Number(m[2]),
    (Number(m[3]) * Math.PI) / 180,
  ];
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ];
}

const clamp = (c: number) => Math.min(1, Math.max(0, c));

export function oklchToHex(value: string): string {
  return (
    "#" +
    oklchToLinear(value)
      .map((c) =>
        Math.round(linearToSrgb(clamp(c)) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  ).toUpperCase();
}

/** WCAG 2.x relative luminance of an `oklch(L C H)` colour (gamut-clamped). */
function luminance(value: string): number {
  const [r, g, b] = oklchToLinear(value).map(clamp);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(fg: string, bg: string): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The `--name: oklch(...)` declarations in the `selector { ... }` block of a stylesheet. */
export function readTokens(
  css: string,
  selector: string,
): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const block = css.slice(start, css.indexOf("\n}", start));
  const entries: [string, string][] = [];
  for (const line of block.split("\n")) {
    const decl = line.trim();
    const colon = decl.indexOf(": oklch(");
    if (decl.startsWith("--") && colon > 0) {
      entries.push([decl.slice(2, colon), decl.slice(colon + 2, -1)]);
    }
  }
  return Object.fromEntries(entries);
}
