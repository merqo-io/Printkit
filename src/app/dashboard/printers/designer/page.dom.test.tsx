// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultStickerTemplate } from "@/lib/sticker-template";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  locations: vi.fn(),
  read: vi.fn(),
  sign: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("not found");
  }),
}));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/lib/vendor-session", () => ({ getVendorSession: mocks.session }));
vi.mock("@/lib/print-locations", () => ({
  listActiveLocations: mocks.locations,
}));
vi.mock("@/components/page-header", () => ({
  PageHeader: () => <h1>Sticker designer</h1>,
}));
vi.mock("./sticker-designer", () => ({
  StickerDesigner: ({
    locationId,
    initialTemplate,
    initialLogoUrls,
  }: {
    locationId: string;
    initialTemplate?: { widthMm: number };
    initialLogoUrls?: Record<string, string>;
  }) => (
    <div>
      Booth {locationId}, width {initialTemplate?.widthMm ?? "default"}, logos{" "}
      {Object.values(initialLogoUrls ?? {}).join(",") || "none"}
    </div>
  ),
}));
import DesignerPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: mocks.read,
  };
  mocks.session.mockResolvedValue({
    user: { id: "vendor" },
    supabase: {
      from: () => query,
      storage: { from: () => ({ createSignedUrls: mocks.sign }) },
    },
  });
  mocks.locations.mockResolvedValue([{ id: "booth-1", label: "Cart" }]);
  mocks.read.mockResolvedValue({ data: null, error: null });
});

describe("sticker designer page", () => {
  it("loads the saved design for the selected booth", async () => {
    mocks.read.mockResolvedValue({
      data: { design: defaultStickerTemplate },
      error: null,
    });
    render(
      await DesignerPage({
        searchParams: Promise.resolve({ location: "booth-1" }),
      }),
    );
    expect(
      screen.getByText(/Booth booth-1, width 40, logos none/),
    ).toBeInTheDocument();
  });
  it("signs URLs for the logos in the saved design", async () => {
    const path =
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.png";
    mocks.read.mockResolvedValue({
      data: {
        design: {
          ...defaultStickerTemplate,
          elements: [
            ...defaultStickerTemplate.elements,
            {
              id: "33333333-3333-4333-8333-333333333333",
              kind: "logo",
              path,
              xMm: 30,
              yMm: 40,
              widthMm: 8,
              heightMm: 8,
            },
          ],
        },
      },
      error: null,
    });
    mocks.sign.mockResolvedValue({
      data: [{ path, signedUrl: "https://signed/logo" }],
    });
    render(await DesignerPage({ searchParams: Promise.resolve({}) }));
    expect(mocks.sign).toHaveBeenCalledWith([path], 3600);
    expect(
      screen.getByText(/logos https:\/\/signed\/logo/),
    ).toBeInTheDocument();
  });
  it("starts with the default design when none exists", async () => {
    render(await DesignerPage({ searchParams: Promise.resolve({}) }));
    expect(
      screen.getByText(/Booth booth-1, width default/),
    ).toBeInTheDocument();
  });
  it("rejects booths that do not belong to the vendor", async () => {
    await expect(
      DesignerPage({ searchParams: Promise.resolve({ location: "other" }) }),
    ).rejects.toThrow("not found");
  });
  it("reports database errors and invalid saved designs", async () => {
    mocks.read.mockResolvedValueOnce({
      data: null,
      error: { message: "unavailable" },
    });
    await expect(
      DesignerPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("Could not load sticker design");
    mocks.read.mockResolvedValueOnce({ data: { design: {} }, error: null });
    await expect(
      DesignerPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("Stored sticker design is invalid");
  });
});
