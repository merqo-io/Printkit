import { beforeEach, describe, expect, it, vi } from "vitest";

const renderSnapshotLabel = vi.hoisted(() => vi.fn());
const needsBoothFallback = vi.hoisted(() => vi.fn());
const createServiceClient = vi.hoisted(() => vi.fn());
const buildLabelLayout = vi.hoisted(() => vi.fn());
const rasterizeLayout = vi.hoisted(() => vi.fn());

vi.mock("@/lib/render-sticker-label", () => ({
  renderSnapshotLabel,
  needsBoothFallback,
}));
vi.mock("@/lib/supabase/server", () => ({ createServiceClient }));
vi.mock("@/lib/label-layout", () => ({ buildLabelLayout }));
vi.mock("@/lib/label-raster", () => ({ rasterizeLayout }));

import { renderJobForPrinter } from "./render-job";

const printer = {
  label_width_mm: 40,
  label_height_mm: 60,
  catalog_id: "no-such-model",
  location_id: "loc-1",
  vendor_id: "vendor-1",
};

function serviceReturning(label: string | null) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: label === null ? null : { label },
          }),
        }),
      }),
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  needsBoothFallback.mockReturnValue(false);
  renderSnapshotLabel.mockResolvedValue(null);
  buildLabelLayout.mockReturnValue({ layout: true });
  rasterizeLayout.mockResolvedValue(Buffer.from("default"));
});

describe("renderJobForPrinter", () => {
  it("returns the saved design's render and skips the default layout", async () => {
    renderSnapshotLabel.mockResolvedValue(Buffer.from("designed"));

    const out = await renderJobForPrinter({}, printer);

    expect(out.toString()).toBe("designed");
    expect(rasterizeLayout).not.toHaveBeenCalled();
    expect(renderSnapshotLabel).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        dpi: 203,
        fitTo: { widthMm: 40, heightMm: 60 },
        boothFallback: "",
      }),
    );
  });

  it("falls back to the default layout at the model dpi when no design renders", async () => {
    const out = await renderJobForPrinter({}, printer);

    expect(out.toString()).toBe("default");
    expect(rasterizeLayout).toHaveBeenCalledWith({ layout: true }, 203);
  });

  it("omits fitTo when the printer has no usable label size", async () => {
    await renderJobForPrinter(
      {},
      { ...printer, label_width_mm: 0, label_height_mm: 60 },
    );

    expect(renderSnapshotLabel).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ fitTo: undefined }),
    );
  });

  it("looks up the booth name when the payload needs it", async () => {
    needsBoothFallback.mockReturnValue(true);
    createServiceClient.mockResolvedValue(serviceReturning("Booth A"));

    await renderJobForPrinter({}, printer);

    expect(renderSnapshotLabel).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ boothFallback: "Booth A" }),
    );
  });

  it("uses an empty booth name when the location row is missing", async () => {
    needsBoothFallback.mockReturnValue(true);
    createServiceClient.mockResolvedValue(serviceReturning(null));

    await renderJobForPrinter({}, printer);

    expect(renderSnapshotLabel).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ boothFallback: "" }),
    );
  });

  it("uses an empty booth name and still prints when the lookup throws", async () => {
    needsBoothFallback.mockReturnValue(true);
    createServiceClient.mockRejectedValue(new Error("db down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const out = await renderJobForPrinter({}, printer);

    expect(out.toString()).toBe("default");
    expect(renderSnapshotLabel).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ boothFallback: "" }),
    );
    spy.mockRestore();
  });
});
