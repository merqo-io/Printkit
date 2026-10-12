// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listActiveLocations = vi.hoisted(() => vi.fn());
vi.mock("@/lib/vendor-session", () => ({
  getVendorSession: async () => ({ user: { id: "vendor-a" } }),
}));
vi.mock("@/lib/print-locations", () => ({ listActiveLocations }));
vi.mock("./printer-picker", () => ({
  PrinterPicker: ({ locationId }: { locationId: string }) => (
    <div data-testid="picker">{locationId}</div>
  ),
}));

import NewPrinterPage from "./page";

const LOCATIONS = [
  { id: "loc-a", label: "Booth A", source_ref: "booth-a" },
  { id: "loc-b", label: "Booth B", source_ref: "booth-b" },
];

function page(location?: string) {
  return NewPrinterPage({ searchParams: Promise.resolve({ location }) });
}

beforeEach(() => {
  listActiveLocations.mockReset().mockResolvedValue(LOCATIONS);
});

describe("NewPrinterPage", () => {
  it("opens the picker for the booth the link names", async () => {
    render(await page("loc-b"));

    expect(listActiveLocations).toHaveBeenCalledWith("vendor-a");
    expect(screen.getByTestId("picker")).toHaveTextContent("loc-b");
    expect(screen.getByText(/labels at Booth B/)).toBeInTheDocument();
  });

  it("opens the picker for the first booth when the link names none", async () => {
    render(await page());

    expect(screen.getByTestId("picker")).toHaveTextContent("loc-a");
  });

  it("never opens another booth's picker for a booth it cannot find", async () => {
    render(await page("loc-gone"));

    expect(screen.queryByTestId("picker")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to printers" }),
    ).toHaveAttribute("href", "/dashboard/printers");
  });
});
