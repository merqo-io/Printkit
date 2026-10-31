import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultStickerTemplate } from "@/lib/sticker-template";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  maybeSingle: vi.fn(),
  used: vi.fn(),
  service: vi.fn(),
  limit: vi.fn(),
  upload: vi.fn(),
  sign: vi.fn(),
  remove: vi.fn(),
  list: vi.fn(),
  rpc: vi.fn(),
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
  renderStickerTemplate: () => ({ ok: true, png: Buffer.from([1]) }),
}));
import {
  removeStickerLogo,
  saveStickerDesign,
  uploadStickerLogo,
} from "./actions";

const vendor = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const location = "11111111-1111-4111-8111-111111111111";
const logoId = "22222222-2222-4222-8222-222222222222";
const ownPath = `${vendor}/${location}/${logoId}.png`;

function png(width: number, height: number, extra = 0) {
  const bytes = new Uint8Array(33 + extra);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  bytes.set([0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52], 8);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}
function jpeg(width: number, height: number) {
  const bytes = new Uint8Array(24);
  bytes.set([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0]);
  bytes.set([0xff, 0xc0, 0, 17, 8], 8);
  const view = new DataView(bytes.buffer);
  view.setUint16(13, height);
  view.setUint16(15, width);
  return bytes;
}
function form(bytes: Uint8Array, type = "image/png", name = "logo.png") {
  const body = new FormData();
  body.set("locationId", location);
  body.set("file", new File([bytes as BlobPart], name, { type }));
  return body;
}

beforeEach(() => {
  vi.clearAllMocks();
  const query = {
    select: () => query,
    eq: () => query,
    contains: () => query,
    limit: mocks.used,
    maybeSingle: mocks.maybeSingle,
  };
  mocks.session.mockResolvedValue({
    user: { id: vendor },
    supabase: { from: () => query },
  });
  mocks.maybeSingle
    .mockReset()
    .mockResolvedValueOnce({ data: { id: location }, error: null })
    .mockResolvedValue({ data: null, error: null });
  mocks.used.mockResolvedValue({ data: [], error: null });
  mocks.limit.mockResolvedValue(true);
  mocks.upload.mockResolvedValue({ error: null });
  mocks.sign.mockResolvedValue({ data: { signedUrl: "https://signed" } });
  mocks.remove.mockResolvedValue({ error: null });
  mocks.list.mockResolvedValue({
    data: [{ name: `${logoId}.png` }],
    error: null,
  });
  mocks.rpc.mockResolvedValue({ data: "template", error: null });
  mocks.service.mockResolvedValue({
    rpc: mocks.rpc,
    storage: {
      from: () => ({
        upload: mocks.upload,
        createSignedUrl: mocks.sign,
        remove: mocks.remove,
        list: mocks.list,
      }),
    },
  });
});

describe("uploadStickerLogo", () => {
  it("stores a PNG under the vendor and booth folder", async () => {
    const result = await uploadStickerLogo(form(png(200, 100)));
    expect(result).toMatchObject({ ok: true, url: "https://signed" });
    expect(mocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${vendor}/${location}/.+\\.png$`)),
      expect.any(Uint8Array),
      { contentType: "image/png", upsert: false },
    );
  });
  it("stores a JPEG with the jpg extension", async () => {
    await uploadStickerLogo(form(jpeg(300, 300), "image/jpeg", "logo.jpg"));
    expect(mocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(/\.jpg$/),
      expect.any(Uint8Array),
      expect.objectContaining({ contentType: "image/jpeg" }),
    );
  });
  it("rejects other types even when the MIME type claims PNG", async () => {
    const result = await uploadStickerLogo(
      form(new TextEncoder().encode("<svg></svg>"), "image/png"),
    );
    expect(result).toEqual({
      ok: false,
      error: "The logo must be a PNG or JPEG.",
    });
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("rejects files over 512 KB", async () => {
    const result = await uploadStickerLogo(form(png(10, 10, 512 * 1024)));
    expect(result).toMatchObject({
      ok: false,
      error: expect.stringContaining("512 KB"),
    });
    expect(mocks.session).not.toHaveBeenCalled();
  });
  it("rejects images over 1024 pixels on either side", async () => {
    for (const bytes of [png(1025, 10), png(10, 1025), jpeg(2000, 100)]) {
      expect(await uploadStickerLogo(form(bytes))).toMatchObject({
        ok: false,
        error: expect.stringContaining("1024"),
      });
    }
    expect(await uploadStickerLogo(form(png(1024, 1024)))).toMatchObject({
      ok: true,
    });
  });
  it("rejects zero-sized and truncated images", async () => {
    expect(await uploadStickerLogo(form(png(0, 10)))).toMatchObject({
      ok: false,
    });
    expect(
      await uploadStickerLogo(form(png(10, 10).slice(0, 20))),
    ).toMatchObject({ ok: false });
    expect(mocks.upload).toHaveBeenCalledTimes(0);
  });
  it("rejects a missing file and a malformed booth id", async () => {
    expect(await uploadStickerLogo(new FormData())).toMatchObject({
      ok: false,
    });
    const body = form(png(10, 10));
    body.set("locationId", "nope");
    expect(await uploadStickerLogo(body)).toMatchObject({ ok: false });
  });
  it("rejects a booth the vendor does not own before using storage", async () => {
    mocks.maybeSingle
      .mockReset()
      .mockResolvedValue({ data: null, error: null });
    expect(await uploadStickerLogo(form(png(10, 10)))).toMatchObject({
      ok: false,
    });
    expect(mocks.service).not.toHaveBeenCalled();
  });
  it("rate limits uploads and reports storage failures", async () => {
    mocks.limit.mockResolvedValue(false);
    expect(await uploadStickerLogo(form(png(10, 10)))).toMatchObject({
      ok: false,
      error: expect.stringContaining("Too many"),
    });
    mocks.limit.mockResolvedValue(true);
    mocks.upload.mockResolvedValue({ error: { message: "down" } });
    expect(await uploadStickerLogo(form(png(10, 10)))).toMatchObject({
      ok: false,
    });
  });
  it("removes the object when it cannot be signed", async () => {
    mocks.sign.mockResolvedValue({ data: null });
    expect(await uploadStickerLogo(form(png(10, 10)))).toMatchObject({
      ok: false,
    });
    expect(mocks.remove).toHaveBeenCalledTimes(1);
  });
});

describe("removeStickerLogo", () => {
  it("deletes an unused logo in the vendor's own folder", async () => {
    expect(await removeStickerLogo(location, ownPath)).toEqual({ ok: true });
    expect(mocks.remove).toHaveBeenCalledWith([ownPath]);
  });
  it("keeps a logo that a saved version still uses", async () => {
    mocks.used.mockResolvedValue({ data: [{ id: "t" }], error: null });
    expect(await removeStickerLogo(location, ownPath)).toEqual({ ok: true });
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("refuses another vendor's path and malformed paths", async () => {
    const foreign = `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/${location}/${logoId}.png`;
    expect(await removeStickerLogo(location, foreign)).toMatchObject({
      ok: false,
    });
    expect(await removeStickerLogo(location, "../x.png")).toMatchObject({
      ok: false,
    });
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});

describe("saveStickerDesign with a logo", () => {
  const logoElement = (path: string) => ({
    id: "33333333-3333-4333-8333-333333333333",
    kind: "logo" as const,
    path,
    xMm: 30,
    yMm: 40,
    widthMm: 8,
    heightMm: 8,
  });
  const design = (path: string) => ({
    ...defaultStickerTemplate,
    elements: [...defaultStickerTemplate.elements, logoElement(path)],
  });
  it("saves a design whose logo exists in the vendor's folder", async () => {
    expect(await saveStickerDesign(location, design(ownPath))).toEqual({
      ok: true,
    });
    expect(mocks.rpc).toHaveBeenCalled();
  });
  it("refuses a logo from another vendor or booth", async () => {
    const foreign = `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/${location}/${logoId}.png`;
    expect(await saveStickerDesign(location, design(foreign))).toMatchObject({
      ok: false,
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("refuses a logo that is not in storage", async () => {
    mocks.list.mockResolvedValue({ data: [], error: null });
    expect(await saveStickerDesign(location, design(ownPath))).toMatchObject({
      ok: false,
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
