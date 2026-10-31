"use client";

import type { StickerTemplate } from "@/lib/sticker-template";
import { names } from "./sticker-content";

type Element = StickerTemplate["elements"][number];
type FieldName = Extract<Element, { kind: "field" }>["field"];

const fields: FieldName[] = [
  "order_number",
  "customer_name",
  "item_name",
  "item_options",
  "unit_position",
  "booth_name",
];

export function AddFieldButtons({
  template,
  onAdd,
}: {
  template: StickerTemplate;
  onAdd: (element: Element) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {fields
        .filter(
          (field) =>
            !template.elements.some(
              (element) => element.kind === "field" && element.field === field,
            ),
        )
        .map((field) => (
          <button
            key={field}
            type="button"
            className="border-input rounded-md border px-3 py-2 text-sm"
            onClick={() =>
              onAdd({
                id: crypto.randomUUID(),
                kind: "field",
                field,
                xMm: template.marginMm,
                yMm: template.marginMm,
                widthMm: Math.min(30, template.widthMm - 2 * template.marginMm),
                heightMm: Math.min(
                  6,
                  template.heightMm - 2 * template.marginMm,
                ),
                fontSizeMm: 3,
                bold: false,
                align: "left",
              })
            }
          >
            Add {names[field]}
          </button>
        ))}
    </div>
  );
}
