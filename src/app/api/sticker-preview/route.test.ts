import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), render: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: async () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock("@/lib/render-sticker-template", () => ({
  renderStickerTemplate: mocks.render,
}));
import { POST } from "./route";

beforeEach(() => {
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
    );
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
});
