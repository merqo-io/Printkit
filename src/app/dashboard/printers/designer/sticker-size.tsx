import type { StickerTemplate } from "@/lib/sticker-template";

export function StickerSize({
  template,
  onChange,
}: {
  template: StickerTemplate;
  onChange: (value: StickerTemplate) => void;
}) {
  return (
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
              aria-label={key === "widthMm" ? "Width (mm)" : "Length (mm)"}
              type="number"
              min={20}
              value={template[key]}
              onChange={(event) =>
                onChange({ ...template, [key]: Number(event.target.value) })
              }
              className="border-input bg-background mt-1 w-full rounded-md border px-3 py-2"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
