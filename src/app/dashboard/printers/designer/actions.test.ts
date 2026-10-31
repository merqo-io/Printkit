import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultStickerTemplate } from "@/lib/sticker-template";
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  maybeSingle: vi.fn(),
  service: vi.fn(),
  rpc: vi.fn(),
  limit: vi.fn(),
  render: vi.fn(),
}));
vi.mock("@/lib/vendor-session", () => ({ getVendorSession: mocks.session }));
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: mocks.service,
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.limit,
  RATE_WINDOW_SECONDS: 60,
}));
vi.mock("@/lib/render-sticker-template", () => ({
  renderStickerTemplate: mocks.render,
}));
import { saveStickerDesign } from "./actions";
const location = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.maybeSingle.mockReset();
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: mocks.maybeSingle,
  };
  mocks.session.mockResolvedValue({
    user: { id: "vendor" },
    supabase: { from: () => query },
  });
  mocks.maybeSingle
    .mockResolvedValueOnce({ data: { id: location }, error: null })
    .mockResolvedValue({ data: null, error: null });
  mocks.service.mockResolvedValue({ rpc: mocks.rpc });
  mocks.rpc.mockResolvedValue({ data: "template", error: null });
  mocks.limit.mockResolvedValue(true);
  mocks.render.mockReturnValue({ ok: true, png: Buffer.from([1]) });
});

describe("saveStickerDesign", () => {
  it("saves a validated design for an owned active booth", async () => {
    expect(await saveStickerDesign(location, defaultStickerTemplate)).toEqual({
      ok: true,
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "save_sticker_template",
      expect.objectContaining({
        p_location_id: location,
        p_vendor_id: "vendor",
      }),
    );
  });
  it("rejects another vendor's booth before using service access", async () => {
    mocks.maybeSingle
      .mockReset()
      .mockResolvedValue({ data: null, error: null });
    expect(
      await saveStickerDesign(location, defaultStickerTemplate),
    ).toMatchObject({ ok: false });
    expect(mocks.service).not.toHaveBeenCalled();
  });
  it("does not save invalid geometry or overflow", async () => {
    expect(
      await saveStickerDesign(location, {
        ...defaultStickerTemplate,
        widthMm: 1,
      }),
    ).toMatchObject({ ok: false });
    expect(mocks.session).not.toHaveBeenCalled();
    mocks.render.mockReturnValue({ ok: false, error: "text_overflow" });
    expect(
      await saveStickerDesign(location, defaultStickerTemplate),
    ).toMatchObject({ ok: false });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("reports a database error instead of claiming to save", async () => {
    mocks.rpc.mockResolvedValue({ error: { message: "unavailable" } });
    expect(
      await saveStickerDesign(location, defaultStickerTemplate),
    ).toMatchObject({ ok: false });
  });
  it("fails closed when the printer lookup fails", async () => {
    mocks.maybeSingle
      .mockReset()
      .mockResolvedValueOnce({ data: { id: location }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "unavailable" } });
    expect(
      await saveStickerDesign(location, defaultStickerTemplate),
    ).toMatchObject({ ok: false });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects sticker widths outside the printer's capabilities", async () => {
    mocks.maybeSingle
      .mockReset()
      .mockResolvedValueOnce({ data: { id: location }, error: null })
      .mockResolvedValueOnce({
        data: { catalog_id: "niimbot-b1" },
        error: null,
      });
    expect(
      await saveStickerDesign(location, {
        ...defaultStickerTemplate,
        widthMm: 60,
      }),
    ).toMatchObject({
      ok: false,
      error: expect.stringContaining("20 to 50 mm"),
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
