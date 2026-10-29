import { payloadField } from "@/lib/print-job-payload";
import type { Json } from "@/lib/types";

export const MAX_LABEL_CHARS = 22;

export type LabelElement =
  | {
      kind: "text";
      text: string;
      xMm: number;
      yMm: number;
      size: "sm" | "md" | "lg" | "xl";
      bold: boolean;
      align: "left" | "center" | "right";
    }
  | { kind: "qr"; value: string; xMm: number; yMm: number; sizeMm: number };

export type LabelLayout = {
  widthMm: number;
  heightMm: number;
  elements: LabelElement[];
};

function truncate(text: string): string {
  return text.length > MAX_LABEL_CHARS
    ? `${text.slice(0, MAX_LABEL_CHARS - 1)}…`
    : text;
}

/**
 * Device-independent label content. Every connector renders this same
 * layout: raster drivers through rasterizeLayout, markup drivers by
 * translating it into their own tags. Positions are in millimetres from the
 * label's top-left, so one layout suits printers of different dpi.
 */
export function buildLabelLayout(
  payload: Json,
  size: { widthMm: number; heightMm: number },
): LabelLayout {
  const rawName = payloadField(payload, "customer_name", "").trim();
  const name = truncate(rawName || "Customer");
  const orderNumber = payloadField(payload, "order_number", "").trim() || "?";
  const item =
    payloadField(payload, "_printkit_label_batch", "") === "v1"
      ? payloadField(payload, "item_name", "").trim()
      : "";
  const options = payloadField(payload, "item_options", "").trim();
  const index = payloadField(payload, "label_index", "");
  const total = payloadField(payload, "label_total", "");

  return {
    widthMm: size.widthMm,
    heightMm: size.heightMm,
    elements: [
      {
        kind: "text",
        text: `#${orderNumber}`,
        xMm: size.widthMm / 2,
        yMm: size.heightMm * (item ? 0.14 : 0.42),
        size: item ? "lg" : "xl",
        bold: true,
        align: "center",
      },
      {
        kind: "text",
        text: name,
        xMm: size.widthMm / 2,
        yMm: size.heightMm * (item ? 0.46 : 0.75),
        size: item ? "sm" : "md",
        bold: false,
        align: "center",
      },
      ...(item
        ? [
            {
              kind: "text" as const,
              text: truncate(item),
              xMm: size.widthMm / 2,
              yMm: size.heightMm * 0.6,
              size: "sm" as const,
              bold: true,
              align: "center" as const,
            },
            {
              kind: "text" as const,
              text: truncate(options),
              xMm: size.widthMm / 2,
              yMm: size.heightMm * 0.74,
              size: "sm" as const,
              bold: false,
              align: "center" as const,
            },
            {
              kind: "text" as const,
              text: `${index}/${total}`,
              xMm: size.widthMm / 2,
              yMm: size.heightMm * 0.89,
              size: "sm" as const,
              bold: false,
              align: "center" as const,
            },
          ]
        : []),
    ],
  };
}
