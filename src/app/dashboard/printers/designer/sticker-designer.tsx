"use client";

import Image from "next/image";
import { saveStickerDesign } from "./actions";
import { StickerSize } from "./sticker-size";
import { PrinterFitNotice, type DesignerPrinter } from "./printer-fit-notice";
import { AddFieldButtons } from "./add-field-buttons";
import { names } from "./sticker-content";
import {
  discardLogo,
  ElementFace,
  LogoPanel,
  newLogoElement,
  uploadLogo,
} from "./logo-panel";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  defaultStickerTemplate,
  stickerTemplateSchema,
  type StickerTemplate,
} from "@/lib/sticker-template";

type Element = StickerTemplate["elements"][number];

export function StickerDesigner({
  locationId,
  initialTemplate,
  initialLogoUrls = {},
  printer,
}: {
  printer?: DesignerPrinter;
  locationId?: string;
  initialTemplate?: StickerTemplate;
  initialLogoUrls?: Record<string, string>;
}) {
  const [logoUrls, setLogoUrls] = useState(initialLogoUrls);
  const [uploading, setUploading] = useState(false);
  const start = initialTemplate ?? defaultStickerTemplate;
  const [template, setTemplate] = useState<StickerTemplate>(start);
  const [selectedId, setSelectedId] = useState(start.elements[0].id);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<StickerTemplate[]>([]);
  const [rendered, setRendered] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const previewVersion = useRef(0);
  const editVersion = useRef(0);
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
    invalidate();
    setRendering(false);
    setError("");
    setHistory((items) => [...items.slice(-19), template]);
    setTemplate(result.data);
  }

  // Any edit makes an in-flight or finished preview and the saved status stale.
  function invalidate() {
    previewVersion.current += 1;
    editVersion.current += 1;
    setRendered(null);
    setSaved(false);
  }

  async function renderPreview() {
    const version = ++previewVersion.current;
    setRendering(true);
    setError("");
    try {
      const response = await fetch("/api/sticker-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The print renderer cannot draw logos yet, so the preview covers text only.
        body: JSON.stringify({
          ...template,
          elements: template.elements.filter(
            (element) => element.kind !== "logo",
          ),
        }),
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

  const logo = template.elements.find(
    (element): element is Extract<Element, { kind: "logo" }> =>
      element.kind === "logo",
  );

  const forgetLogoUrl = (path: string) =>
    setLogoUrls((urls) =>
      Object.fromEntries(Object.entries(urls).filter(([key]) => key !== path)),
    );

  async function chooseLogo(file: File) {
    if (!locationId) return;
    setUploading(true);
    setError("");
    const result = await uploadLogo(locationId, file);
    setUploading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setLogoUrls((urls) => ({ ...urls, [result.path]: result.url }));
    if (logo) {
      updateElement(logo.id, { path: result.path });
      discardLogo(locationId, logo.path, forgetLogoUrl);
      return;
    }
    const added = newLogoElement(template, result.path);
    update({ ...template, elements: [...template.elements, added] });
    setSelectedId(added.id);
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
        Designs can be saved for this booth. Order printing does not use them
        yet.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {locationId && (
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              setSaved(false);
              const version = editVersion.current;
              const result = await saveStickerDesign(
                locationId,
                template,
              ).catch(() => ({
                ok: false as const,
                error: "Could not save your design. Please try again.",
              }));
              if (result.ok && version === editVersion.current) setSaved(true);
              else if (!result.ok) setError(result.error);
              setSaving(false);
            }}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Saving�" : "Save design"}
          </button>
        )}
        {saved && (
          <span role="status" className="text-sm">
            Design saved for this booth.
          </span>
        )}
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
                <ElementFace element={element} logoUrls={logoUrls} />
              </button>
            ))}
          </div>
        </section>
        <section aria-label="Sticker settings" className="space-y-6">
          <PrinterFitNotice printer={printer} template={template} />
          <StickerSize template={template} onChange={update} />
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
          <AddFieldButtons
            template={template}
            onAdd={(element) => {
              update({
                ...template,
                elements: [...template.elements, element],
              });
              setSelectedId(element.id);
            }}
          />
          {locationId && (
            <LogoPanel
              hasLogo={Boolean(logo)}
              uploading={uploading}
              onFile={(file) => void chooseLogo(file)}
            />
          )}
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
              {selected.kind === "field" && (
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.bold}
                      onChange={(event) =>
                        updateElement(selected.id, {
                          bold: event.target.checked,
                        })
                      }
                    />{" "}
                    Bold text
                  </label>
                  <label className="block text-sm font-medium">
                    Alignment
                    <select
                      aria-label="Alignment"
                      value={selected.align}
                      onChange={(event) => {
                        const alignment = event.target.value;
                        if (
                          alignment === "left" ||
                          alignment === "center" ||
                          alignment === "right"
                        )
                          updateElement(selected.id, { align: alignment });
                      }}
                      className="border-input bg-background mt-1 w-full rounded-md border px-3 py-2"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </label>
                </div>
              )}
              <button
                type="button"
                disabled={template.elements.length <= 1}
                className="border-input rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                onClick={() => {
                  const elements = template.elements.filter(
                    (element) => element.id !== selected.id,
                  );
                  if (elements.length) {
                    update({ ...template, elements });
                    setSelectedId(elements[0].id);
                    if (selected.kind === "logo" && locationId)
                      discardLogo(locationId, selected.path, forgetLogoUrl);
                  }
                }}
              >
                {selected.kind === "logo" ? "Remove logo" : "Remove field"}
              </button>
            </div>
          )}
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={!history.length}
            className="border-input mr-2 rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
            onClick={() => {
              const previous = history[history.length - 1];
              if (previous) {
                invalidate();
                setTemplate(previous);
                setSelectedId(previous.elements[0].id);
                setHistory((items) => items.slice(0, -1));
                setError("");
              }
            }}
          >
            Undo
          </button>
          <button
            type="button"
            className="border-input rounded-md border px-4 py-2 text-sm font-medium"
            onClick={() => {
              invalidate();
              setRendering(false);
              setHistory((items) => [...items.slice(-19), template]);
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
