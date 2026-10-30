"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  defaultStickerTemplate,
  stickerTemplateSchema,
  type StickerTemplate,
} from "@/lib/sticker-template";

type Element = StickerTemplate["elements"][number];
const examples: Record<string, string> = {
  order_number: `#${"001"}`,
  customer_name: "Alex",
  item_name: "Kopi",
  item_options: "O (black)\nHot\nNormal sugar",
  unit_position: "1 / 3",
  booth_name: "Kopitiam Cart",
};
const names: Record<string, string> = {
  order_number: "Order number",
  customer_name: "Customer name",
  item_name: "Item name",
  item_options: "Drink options",
  unit_position: "Item count",
  booth_name: "Booth name",
};

export function StickerDesigner() {
  const [template, setTemplate] = useState<StickerTemplate>(
    defaultStickerTemplate,
  );
  const [selectedId, setSelectedId] = useState(
    defaultStickerTemplate.elements[0].id,
  );
  const [error, setError] = useState("");
  const [rendered, setRendered] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const previewVersion = useRef(0);
  useEffect(
    () => () => {
      if (rendered) URL.revokeObjectURL(rendered);
    },
    [rendered],
  );
  const drag = useRef<{
    id: string;
    x: number;
    y: number;
    startX: number;
    startY: number;
    canvasWidth: number;
  } | null>(null);
  const selected = template.elements.find(
    (element) => element.id === selectedId,
  );

  function update(next: StickerTemplate) {
    const result = stickerTemplateSchema.safeParse(next);
    if (!result.success) {
      setError(
        "The label or a field extends outside the printable margins. Adjust the field or use a larger label.",
      );
      return;
    }
    previewVersion.current += 1;
    setRendered(null);
    setRendering(false);
    setError("");
    setTemplate(result.data);
  }

  async function renderPreview() {
    const version = ++previewVersion.current;
    setRendering(true);
    setError("");
    try {
      const response = await fetch("/api/sticker-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });
      if (version !== previewVersion.current) return;
      if (!response.ok) {
        const data: unknown = await response.json();
        const overflow =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          data.error === "text_overflow";
        setError(
          overflow
            ? "Some text does not fit. Enlarge its field or reduce the text size."
            : "Could not render the preview. Check the design and try again.",
        );
        return;
      }
      const blob = await response.blob();
      if (version !== previewVersion.current) return;
      setRendered(URL.createObjectURL(blob));
    } catch {
      if (version === previewVersion.current)
        setError(
          "Could not render the preview. Check your connection and try again.",
        );
    } finally {
      if (version === previewVersion.current) setRendering(false);
    }
  }

  function updateElement(id: string, values: Partial<Element>) {
    update({
      ...template,
      elements: template.elements.map((element) =>
        element.id === id ? ({ ...element, ...values } as Element) : element,
      ),
    });
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>, element: Element) {
    const canvas = event.currentTarget.parentElement;
    if (!canvas) return;
    setSelectedId(element.id);
    drag.current = {
      id: element.id,
      x: element.xMm,
      y: element.yMm,
      startX: event.clientX,
      startY: event.clientY,
      canvasWidth: canvas.getBoundingClientRect().width,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    const element = template.elements.find((item) => item.id === current?.id);
    if (!current || !element || !current.canvasWidth) return;
    const scale = template.widthMm / current.canvasWidth;
    const xMm =
      Math.round(
        Math.max(
          template.marginMm,
          Math.min(
            template.widthMm - template.marginMm - element.widthMm,
            current.x + (event.clientX - current.startX) * scale,
          ),
        ) * 10,
      ) / 10;
    const yMm =
      Math.round(
        Math.max(
          template.marginMm,
          Math.min(
            template.heightMm - template.marginMm - element.heightMm,
            current.y + (event.clientY - current.startY) * scale,
          ),
        ) * 10,
      ) / 10;
    updateElement(current.id, { xMm, yMm });
  }

  return (
    <div className="space-y-5">
      <p
        role="status"
        className="bg-muted text-muted-foreground rounded-lg p-4 text-sm"
      >
        Preview only. Changes are not saved or used for printing yet.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={renderPreview}
          disabled={rendering}
          className="border-input rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {rendering ? "Rendering�" : "Render print preview"}
        </button>
        <span className="text-muted-foreground text-sm">
          This preview uses the printer renderer and does not print.
        </span>
      </div>
      {rendered && (
        <div className="bg-muted rounded-lg p-4">
          <p className="mb-3 text-sm font-medium">Rendered print preview</p>
          <Image
            unoptimized
            src={rendered}
            width={320}
            height={480}
            alt="Rendered sample sticker"
            className="h-auto max-w-full"
          />
        </div>
      )}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <section
          aria-label="Sticker preview"
          className="bg-muted flex min-h-[32rem] items-center justify-center overflow-auto rounded-xl p-6"
        >
          <div
            aria-label={`Sticker preview, ${template.widthMm} by ${template.heightMm} millimetres`}
            className="relative w-full max-w-[320px] overflow-hidden bg-white text-black shadow-md"
            style={{
              aspectRatio: `${template.widthMm} / ${template.heightMm}`,
              containerType: "inline-size",
            }}
          >
            {template.elements.map((element) => (
              <button
                key={element.id}
                type="button"
                aria-label={`Select ${element.kind === "field" ? names[element.field] : "logo"}`}
                aria-pressed={selectedId === element.id}
                onPointerDown={(event) => startDrag(event, element)}
                onPointerMove={moveDrag}
                onPointerUp={() => {
                  drag.current = null;
                }}
                onPointerCancel={() => {
                  drag.current = null;
                }}
                onClick={() => setSelectedId(element.id)}
                className="absolute cursor-move touch-none overflow-hidden whitespace-pre-line border border-transparent leading-tight focus-visible:outline-2 aria-pressed:border-current"
                style={{
                  left: `${(100 * element.xMm) / template.widthMm}%`,
                  top: `${(100 * element.yMm) / template.heightMm}%`,
                  width: `${(100 * element.widthMm) / template.widthMm}%`,
                  height: `${(100 * element.heightMm) / template.heightMm}%`,
                  fontSize:
                    element.kind === "field"
                      ? `${(100 * element.fontSizeMm) / template.widthMm}cqw`
                      : "12px",
                  fontWeight:
                    element.kind === "field" && element.bold ? 700 : 400,
                  textAlign:
                    element.kind === "field" ? element.align : "center",
                }}
              >
                {element.kind === "field" ? examples[element.field] : "Logo"}
              </button>
            ))}
          </div>
        </section>
        <section aria-label="Sticker settings" className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Sticker size</h2>
            <p className="text-muted-foreground text-sm">
              Width across the roll and length along the feed.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {(["widthMm", "heightMm"] as const).map((key) => (
                <label key={key} className="text-sm font-medium">
                  {key === "widthMm" ? "Width (mm)" : "Length (mm)"}
                  <input
                    aria-label={
                      key === "widthMm" ? "Width (mm)" : "Length (mm)"
                    }
                    type="number"
                    min={20}
                    value={template[key]}
                    onChange={(event) =>
                      update({ ...template, [key]: Number(event.target.value) })
                    }
                    className="border-input bg-background mt-1 w-full rounded-md border px-3 py-2"
                  />
                </label>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Fields</h2>
            <p className="text-muted-foreground text-sm">
              Select a field or drag it on the sticker.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {template.elements.map((element) => (
                <button
                  key={element.id}
                  type="button"
                  aria-pressed={selectedId === element.id}
                  onClick={() => setSelectedId(element.id)}
                  className="border-input rounded-md border px-3 py-2 text-sm aria-pressed:border-foreground aria-pressed:font-semibold"
                >
                  {element.kind === "field" ? names[element.field] : "Logo"}
                </button>
              ))}
            </div>
          </div>
          {selected && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Position and size</h2>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["xMm", "Left (mm)"],
                    ["yMm", "Top (mm)"],
                    ["widthMm", "Field width (mm)"],
                    ["heightMm", "Field height (mm)"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="text-sm font-medium">
                    {label}
                    <input
                      aria-label={label}
                      type="number"
                      step="0.5"
                      value={selected[key]}
                      onChange={(event) =>
                        updateElement(selected.id, {
                          [key]: Number(event.target.value),
                        })
                      }
                      className="border-input bg-background mt-1 w-full rounded-md border px-3 py-2"
                    />
                  </label>
                ))}
              </div>
              {selected.kind === "field" && (
                <label className="block text-sm font-medium">
                  Text size (mm)
                  <input
                    aria-label="Text size (mm)"
                    type="number"
                    min="1.5"
                    step="0.5"
                    value={selected.fontSizeMm}
                    onChange={(event) =>
                      updateElement(selected.id, {
                        fontSizeMm: Number(event.target.value),
                      })
                    }
                    className="border-input bg-background mt-1 w-full rounded-md border px-3 py-2"
                  />
                </label>
              )}
            </div>
          )}
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <button
            type="button"
            className="border-input rounded-md border px-4 py-2 text-sm font-medium"
            onClick={() => {
              previewVersion.current += 1;
              setRendered(null);
              setRendering(false);
              setTemplate(defaultStickerTemplate);
              setSelectedId(defaultStickerTemplate.elements[0].id);
              setError("");
            }}
          >
            Reset preview
          </button>
        </section>
      </div>
    </div>
  );
}
