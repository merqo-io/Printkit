import type { StickerTemplate } from "@/lib/sticker-template";

export type DesignerPrinter = {
  model: string;
  connector: string;
  labelWidthMm: number;
  labelHeightMm: number;
};

const close = (a: number, b: number) => Math.abs(a - b) < 0.05;

/**
 * Tells the vendor what the paired printer will do with the design: a Feie
 * printer prints the standard label, and a size mismatch is scaled to fit.
 */
export function PrinterFitNotice({
  printer,
  template,
}: {
  printer?: DesignerPrinter;
  template: StickerTemplate;
}) {
  if (!printer) return null;
  if (printer.connector === "vendor_cloud")
    return (
      <p role="note" className="rounded-md border p-3 text-sm">
        This printer prints the standard label; custom designs are not
        supported.
      </p>
    );
  if (
    close(printer.labelWidthMm, template.widthMm) &&
    close(printer.labelHeightMm, template.heightMm)
  )
    return null;
  return (
    <p role="note" className="rounded-md border p-3 text-sm">
      Your {printer.model} label is {printer.labelWidthMm} by{" "}
      {printer.labelHeightMm} mm, but this sticker is {template.widthMm} by{" "}
      {template.heightMm} mm. It will be scaled to fit the label and centered.
      Set the sticker size to match for the sharpest print.
    </p>
  );
}
