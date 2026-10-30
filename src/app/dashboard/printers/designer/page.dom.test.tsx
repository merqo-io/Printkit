// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultStickerTemplate } from "@/lib/sticker-template";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  locations: vi.fn(),
  read: vi.fn(),
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
  }: {
    locationId: string;
    initialTemplate?: { widthMm: number };
  }) => (
    <div>
      Booth {locationId}, width {initialTemplate?.widthMm ?? "default"}
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
    supabase: { from: () => query },
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
    expect(screen.getByText("Booth booth-1, width 40")).toBeInTheDocument();
  });
  it("starts with the default design when none exists", async () => {
    render(await DesignerPage({ searchParams: Promise.resolve({}) }));
    expect(
      screen.getByText("Booth booth-1, width default"),
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
