import { payloadField } from "@/lib/print-job-payload";
import {
  renderStickerTemplate,
  type StickerValues,
} from "@/lib/render-sticker-template";
import { loadStickerLogos, parseStickerTemplate } from "@/lib/sticker-logos";
import type { Json } from "@/lib/types";

export const STICKER_SNAPSHOT_KEY = "_printkit_sticker_template";

function snapshotOf(payload: Json): Json | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload))
    return null;
  return payload[STICKER_SNAPSHOT_KEY] ?? null;
}

/** True when the frozen design has a booth name line that the order did not fill. */
export function needsBoothFallback(payload: Json): boolean {
  if (payloadField(payload, "booth_name", "").trim()) return false;
  const template = parseStickerTemplate(snapshotOf(payload));
  return !!template?.elements.some(
    (element) => element.kind === "field" && element.field === "booth_name",
  );
}

function valuesFrom(payload: Json, boothFallback: string): StickerValues {
  const orderNumber = payloadField(payload, "order_number", "").trim();
  const index = payloadField(payload, "label_index", "");
  const total = payloadField(payload, "label_total", "");
  return {
    order_number: orderNumber ? `#${orderNumber}` : "?",
    customer_name: payloadField(payload, "customer_name", "").trim(),
    item_name: payloadField(payload, "item_name", "").trim(),
    item_options: payloadField(payload, "item_options", "").trim(),
    unit_position: index && total ? `${index} / ${total}` : "",
    // qkit does not always send booth_name; the location name stands in, else the line stays empty.
    booth_name:
      payloadField(payload, "booth_name", "").trim() || boothFallback.trim(),
  };
}

export type SnapshotRenderOptions = {
  dpi: number;
  /** Whose logo folder this job may read from. */
  owner: { vendorId: string; locationId: string };
  /** The printer's label size; the design is scaled to fit it. */
  fitTo?: { widthMm: number; heightMm: number };
  /** Location name used when the order carries no booth_name. */
  boothFallback?: string;
};

/**
 * Renders a job from the template snapshot the database froze onto it at
 * order time, so a later design edit never changes a queued label. Returns
 * null (caller uses the default label) when there is no snapshot or it no
 * longer validates or renders; long text and unusable logos never fail here,
 * they are fitted or skipped.
 */
export async function renderSnapshotLabel(
  payload: Json,
  options: SnapshotRenderOptions,
): Promise<Buffer | null> {
  const snapshot = snapshotOf(payload);
  if (snapshot === null) return null;
  const order = payloadField(payload, "order_number", "?");
  const ref = `order ${order} label ${payloadField(payload, "label_index", "?")}`;
  try {
    const template = parseStickerTemplate(snapshot);
    const logos = template
      ? await loadStickerLogos(template, options.owner, undefined, ref)
      : undefined;
    const result = renderStickerTemplate(
      snapshot,
      valuesFrom(payload, options.boothFallback ?? ""),
      options.dpi,
      { overflow: "fit", logos, fitTo: options.fitTo },
    );
    if (result.ok) return result.png;
    console.error("sticker snapshot not rendered", ref, result.error);
  } catch (err) {
    console.error("sticker snapshot render threw", ref, err);
  }
  return null;
}
