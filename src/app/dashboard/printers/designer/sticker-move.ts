import type { StickerTemplate } from "@/lib/sticker-template";

type Element = StickerTemplate["elements"][number];

const round1 = (value: number) => Math.round(value * 10) / 10;

export function clampPosition(
  template: StickerTemplate,
  element: Element,
  x: number,
  y: number,
) {
  const limit = (value: number, size: number, extent: number) =>
    round1(
      Math.max(
        template.marginMm,
        Math.min(extent - template.marginMm - size, value),
      ),
    );
  return {
    xMm: limit(x, element.widthMm, template.widthMm),
    yMm: limit(y, element.heightMm, template.heightMm),
  };
}

/** Arrow-key offset in mm: 1 per press, 10 with Shift. */
export function arrowDelta(key: string, shift: boolean): [number, number] {
  const step = shift ? 10 : 1;
  const dx = { ArrowLeft: -step, ArrowRight: step }[key] ?? 0;
  const dy = { ArrowUp: -step, ArrowDown: step }[key] ?? 0;
  return [dx, dy];
}

export type DragState = {
  id: string;
  x: number;
  y: number;
  startX: number;
  startY: number;
  canvasWidth: number;
};
