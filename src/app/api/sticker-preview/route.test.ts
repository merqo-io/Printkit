import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  render: vi.fn(),
  limit: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: async () => ({ auth: { getUser: mocks.getUser } }),
  createServiceClient: async () => ({}),
}));
vi.mock("@/lib/render-sticker-template", () => ({
  renderStickerTemplate: mocks.render,
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.limit,
  RATE_WINDOW_SECONDS: 60,
}));
import { POST } from "./route";

beforeEach(() => {
  mocks.limit.mockReset().mockResolvedValue(true);
  mocks.getUser
    .mockReset()
    .mockResolvedValue({ data: { user: { id: "vendor" } } });
  mocks.render
    .mockReset()
    .mockReturnValue({ ok: true, png: Buffer.from([1, 2, 3]) });
});

describe("sticker preview", () => {
  it("requires sign-in before rendering", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    expect(
      (
        await POST(
          new Request("http://localhost", { method: "POST", body: "{}" }),
        )
      ).status,
    ).toBe(401);
    expect(mocks.render).not.toHaveBeenCalled();
  });
  it("returns the renderer's PNG without making a print job", async () => {
    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ version: 1 }),
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(mocks.render).toHaveBeenCalledWith(
      { version: 1 },
      expect.objectContaining({ item_name: "Kopi" }),
      203,
      expect.anything(),
    );
  });
  it("loads no logos unless the request names the booth being designed", async () => {
    await POST(new Request("http://localhost", { method: "POST", body: "{}" }));
    expect(mocks.render.mock.calls[0][3]).toEqual({ logos: undefined });
  });
  it("returns an actionable overflow error", async () => {
    mocks.render.mockReturnValue({
      ok: false,
      error: "text_overflow",
      elementId: "field",
    });
    const response = await POST(
      new Request("http://localhost", { method: "POST", body: "{}" }),
    );
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: "text_overflow",
      elementId: "field",
    });
  });
  it("rejects oversize streamed input before rendering", async () => {
    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: "x".repeat(33000),
      }),
    );
    expect(response.status).toBe(413);
    expect(mocks.render).not.toHaveBeenCalled();
  });
  it("does not render when the vendor reaches the preview limit", async () => {
    mocks.limit.mockResolvedValue(false);
    const response = await POST(
      new Request("http://localhost", { method: "POST", body: "{}" }),
    );
    expect(response.status).toBe(429);
    expect(mocks.render).not.toHaveBeenCalled();
  });
});
