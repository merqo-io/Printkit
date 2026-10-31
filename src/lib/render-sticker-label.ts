import { payloadField } from "@/lib/print-job-payload";
import {
  renderStickerTemplate,
  type StickerValues,
} from "@/lib/render-sticker-template";
import type { Json } from "@/lib/types";

export const STICKER_SNAPSHOT_KEY = "_printkit_sticker_template";

function snapshotOf(payload: Json): Json | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload))
    return null;
  return payload[STICKER_SNAPSHOT_KEY] ?? null;
}

function valuesFrom(payload: Json): StickerValues {
  const orderNumber = payloadField(payload, "order_number", "").trim();
  const index = payloadField(payload, "label_index", "");
  const total = payloadField(payload, "label_total", "");
  return {
    order_number: orderNumber ? `#${orderNumber}` : "?",
    customer_name: payloadField(payload, "customer_name", "").trim(),
    item_name: payloadField(payload, "item_name", "").trim(),
    item_options: payloadField(payload, "item_options", "").trim(),
    unit_position: index && total ? `${index} / ${total}` : "",
    booth_name: payloadField(payload, "booth_name", "").trim(),
  };
}

/**
 * Renders a job from the template snapshot the database froze onto it at
 * order time, so a later design edit never changes a queued label. Returns
 * null (caller uses the default label) when there is no snapshot or it no
 * longer validates or renders; long text never fails here, it is fitted.
 */
export function renderSnapshotLabel(payload: Json, dpi: number): Buffer | null {
  const snapshot = snapshotOf(payload);
  if (snapshot === null) return null;
  try {
    const result = renderStickerTemplate(
      snapshot,
      valuesFrom(payload),
      dpi,
      "fit",
    );
    if (result.ok) return result.png;
    console.error("sticker snapshot not rendered", result.error);
  } catch (err) {
    console.error("sticker snapshot render threw", err);
  }
  return null;
}
