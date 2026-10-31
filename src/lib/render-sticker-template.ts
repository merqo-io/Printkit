import path from "node:path";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import {
  stickerTemplateSchema,
  type StickerTemplate,
} from "@/lib/sticker-template";
import { mmToPx } from "@/lib/label-raster";

const NORMAL = "StickerTemplateNormal";
const BOLD = "StickerTemplateBold";
const CJK = "StickerTemplateCJK";
const MIN_FONT_MM = 1.5;
const MIN_FONT_RATIO = 0.6;
let ready = false;

function ensureFonts() {
  if (ready) return;
  const dir = path.join(process.cwd(), "src/assets/fonts");
  if (
    !GlobalFonts.registerFromPath(
      path.join(dir, "NotoSans-Regular.ttf"),
      NORMAL,
    ) ||
    !GlobalFonts.registerFromPath(path.join(dir, "NotoSans-Bold.ttf"), BOLD) ||
    !GlobalFonts.registerFromPath(path.join(dir, "NotoSansSC-Regular.otf"), CJK)
  ) {
    throw new Error("Sticker fonts could not be loaded");
  }
  ready = true;
}

export type StickerValues = Partial<
  Record<
    | "order_number"
    | "customer_name"
    | "item_name"
    | "item_options"
    | "unit_position"
    | "booth_name",
    string
  >
>;
export type OverflowMode = "reject" | "fit";
export type StickerRenderResult =
  | { ok: true; png: Buffer }
  | {
      ok: false;
      error: "invalid_template" | "text_overflow" | "logo_not_supported";
      elementId?: string;
    };

function splitLongWord(
  word: string,
  maxWidth: number,
  measure: (text: string) => number,
): string[] | null {
  const parts: string[] = [];
  let part = "";
  const graphemes = new Intl.Segmenter(undefined, {
    granularity: "grapheme",
  }).segment(word);
  for (const { segment } of graphemes) {
    if (measure(segment) > maxWidth) return null;
    if (part && measure(part + segment) > maxWidth) {
      parts.push(part);
      part = segment;
    } else part += segment;
  }
  if (part) parts.push(part);
  return parts;
}

function wrapParagraph(
  paragraph: string,
  maxWidth: number,
  measure: (text: string) => number,
): string[] | null {
  const lines: string[] = [];
  let line = "";
  for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
    if (measure(word) > maxWidth) {
      if (line) lines.push(line);
      const parts = splitLongWord(word, maxWidth, measure);
      if (!parts) return null;
      lines.push(...parts.slice(0, -1));
      line = parts.at(-1) ?? "";
      continue;
    }
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate) <= maxWidth) line = candidate;
    else {
      lines.push(line);
      line = word;
    }
  }
  lines.push(line);
  return lines;
}

function wrapText(
  text: string,
  maxWidth: number,
  measure: (text: string) => number,
): string[] | null {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    const wrapped = wrapParagraph(paragraph, maxWidth, measure);
    if (!wrapped) return null;
    lines.push(...wrapped);
  }
  return lines;
}

// Drops whole graphemes so an emoji or combined character is never cut in half.
function ellipsize(
  text: string,
  maxWidth: number,
  measure: (text: string) => number,
): string {
  const graphemes = [
    ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text),
  ].map((part) => part.segment);
  while (graphemes.length && measure(`${graphemes.join("")}…`) > maxWidth)
    graphemes.pop();
  const kept = graphemes.join("").trimEnd();
  return measure(`${kept}…`) <= maxWidth ? `${kept}…` : "";
}

const CJK_CHAR =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

// CJK lines were split without whitespace, so rejoining them must not add one.
export function joinLines(last: string, rest: string): string {
  const unspaced =
    CJK_CHAR.test(last.slice(-1)) || CJK_CHAR.test(rest.slice(0, 1));
  return unspaced ? `${last}${rest}` : `${last} ${rest}`;
}

type Measure = (text: string) => number;
type Fitted = { fontSize: number; lineHeight: number; lines: string[] };

// Wrap at the design size, shrink to a floor, then truncate the last line.
// Returns null only when not even one line fits the box height.
function fitText(
  text: string,
  box: { width: number; height: number },
  sizes: { design: number; min: number },
  tools: { setSize: (size: number) => void; measure: Measure },
): Fitted | null {
  const { width: maxWidth, height: maxHeight } = box;
  const { design: designSize, min: minSizePx } = sizes;
  const { setSize, measure } = tools;
  const floor = Math.min(
    designSize,
    Math.max(minSizePx, Math.floor(designSize * MIN_FONT_RATIO)),
  );
  for (let size = designSize; size >= floor; size--) {
    setSize(size);
    const lineHeight = Math.ceil(size * 1.25);
    const lines = wrapText(text, maxWidth, measure);
    if (lines && lines.length * lineHeight <= maxHeight)
      return { fontSize: size, lineHeight, lines };
  }
  setSize(floor);
  const lineHeight = Math.ceil(floor * 1.25);
  const maxLines = Math.floor(maxHeight / lineHeight);
  if (maxLines < 1) return null;
  const wrapped = wrapText(text, maxWidth, measure);
  // A single glyph wider than the box cannot be wrapped; truncate the raw text.
  const source = wrapped ?? [text.replace(/\s+/g, " ").trim()];
  const kept = source.slice(0, maxLines);
  if (!kept.length) return { fontSize: floor, lineHeight, lines: [] };
  const rest = source.slice(maxLines).join(" ");
  const last = kept[kept.length - 1];
  kept[kept.length - 1] = ellipsize(
    rest ? joinLines(last, rest) : last,
    maxWidth,
    measure,
  );
  return { fontSize: floor, lineHeight, lines: kept };
}

/**
 * Renders one immutable template. "reject" (designer preview) reports text
 * that does not fit so the vendor can fix the box; "fit" (live orders) never
 * fails for text: it shrinks, then truncates with an ellipsis.
 */
export function renderStickerTemplate(
  input: unknown,
  values: StickerValues,
  dpi = 203,
  overflow: OverflowMode = "reject",
): StickerRenderResult {
  const parsed = stickerTemplateSchema.safeParse(input);
  if (!parsed.success || !Number.isFinite(dpi) || dpi < 72 || dpi > 600)
    return { ok: false, error: "invalid_template" };
  const template: StickerTemplate = parsed.data;
  ensureFonts();
  const width = mmToPx(template.widthMm, dpi);
  const height = mmToPx(template.heightMm, dpi);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "black";
  ctx.textBaseline = "top";
  const issue = drawElements(ctx, template, values, { dpi, overflow });
  if (issue) return issue;
  const pixels = ctx.getImageData(0, 0, width, height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const luminance =
      0.299 * pixels.data[i] +
      0.587 * pixels.data[i + 1] +
      0.114 * pixels.data[i + 2];
    const shade = luminance < 128 ? 0 : 255;
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = shade;
    pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  return { ok: true, png: canvas.toBuffer("image/png") };
}

type Ctx = ReturnType<ReturnType<typeof createCanvas>["getContext"]>;
type FieldElement = Extract<
  StickerTemplate["elements"][number],
  { kind: "field" }
>;

// Lays out one field's text; "reject" returns null when it does not fit.
function layoutField(
  ctx: Ctx,
  element: FieldElement,
  text: string,
  opts: { dpi: number; overflow: OverflowMode },
): Fitted | null {
  const { dpi, overflow } = opts;
  const box = {
    width: mmToPx(element.widthMm, dpi),
    height: mmToPx(element.heightMm, dpi),
  };
  const measure = (value: string) => ctx.measureText(value).width;
  const setSize = (size: number) => {
    ctx.font = `${size}px "${element.bold ? BOLD : NORMAL}", "${CJK}"`;
  };
  const design = mmToPx(element.fontSizeMm, dpi);
  if (overflow === "fit")
    return fitText(
      text,
      box,
      { design, min: mmToPx(MIN_FONT_MM, dpi) },
      { setSize, measure },
    );
  setSize(design);
  const lineHeight = Math.ceil(design * 1.25);
  const lines = wrapText(text, box.width, measure);
  if (!lines || lines.length * lineHeight > box.height) return null;
  return { fontSize: design, lineHeight, lines };
}

function drawElements(
  ctx: Ctx,
  template: StickerTemplate,
  values: StickerValues,
  opts: { dpi: number; overflow: OverflowMode },
): Exclude<StickerRenderResult, { ok: true }> | null {
  const { dpi, overflow } = opts;
  for (const element of template.elements) {
    if (element.kind === "logo")
      return { ok: false, error: "logo_not_supported", elementId: element.id };
    const fitted = layoutField(ctx, element, values[element.field] ?? "", opts);
    if (!fitted) {
      if (overflow === "fit") continue;
      return { ok: false, error: "text_overflow", elementId: element.id };
    }
    const availableWidth = mmToPx(element.widthMm, dpi);
    ctx.textAlign = element.align;
    let offset = 0;
    if (element.align === "center") offset = availableWidth / 2;
    if (element.align === "right") offset = availableWidth;
    const x = mmToPx(element.xMm, dpi) + offset;
    const y = mmToPx(element.yMm, dpi);
    const { lineHeight } = fitted;
    fitted.lines.forEach((line, index) =>
      ctx.fillText(line, x, y + index * lineHeight),
    );
  }
  return null;
}
