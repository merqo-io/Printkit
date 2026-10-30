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

type Values = Partial<
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

/** Renders one immutable template; rejects rather than silently clipping text. */
export function renderStickerTemplate(
  input: unknown,
  values: Values,
  dpi = 203,
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
  const issue = drawElements(ctx, template, values, dpi);
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

function drawElements(
  ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
  template: StickerTemplate,
  values: Values,
  dpi: number,
): Exclude<StickerRenderResult, { ok: true }> | null {
  for (const element of template.elements) {
    if (element.kind === "logo")
      return { ok: false, error: "logo_not_supported", elementId: element.id };
    const text = values[element.field] ?? "";
    const fontSize = mmToPx(element.fontSizeMm, dpi);
    const lineHeight = Math.ceil(fontSize * 1.25);
    ctx.font = `${fontSize}px "${element.bold ? BOLD : NORMAL}", "${CJK}"`;
    const availableWidth = mmToPx(element.widthMm, dpi);
    const lines = wrapText(
      text,
      availableWidth,
      (value) => ctx.measureText(value).width,
    );
    if (!lines || lines.length * lineHeight > mmToPx(element.heightMm, dpi)) {
      return { ok: false, error: "text_overflow", elementId: element.id };
    }
    ctx.textAlign = element.align;
    let offset = 0;
    if (element.align === "center") offset = availableWidth / 2;
    if (element.align === "right") offset = availableWidth;
    const x = mmToPx(element.xMm, dpi) + offset;
    const y = mmToPx(element.yMm, dpi);
    lines.forEach((line, index) =>
      ctx.fillText(line, x, y + index * lineHeight),
    );
  }
  return null;
}
