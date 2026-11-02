// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("./actions", () => ({
  removePrinter: vi.fn(),
  sendTestPrint: vi.fn(),
}));
const summaries = vi.hoisted(() => vi.fn());
vi.mock("@/lib/vendor-session", () => ({
  getVendorSession: async () => ({ user: { id: "vendor-a" } }),
}));
vi.mock("@/lib/location-printer-summaries", () => ({
  listLocationPrinterSummaries: summaries,
}));
import PrintersPage from "./page";
it("shows setup links and live status from the scoped summaries", async () => {
  summaries.mockResolvedValue([
    {
      location: { id: "a", label: "A", source_ref: "booth-a" },
      printer: null,
      state: "not_set_up",
    },
    {
      location: { id: "loc-b", label: "B", source_ref: "booth-b" },
      printer: {
        display_name: "Printer B",
        connector: "bridge",
        catalog_id: "niimbot-b1",
        last_seen_at: null,
      },
      state: "offline",
    },
  ]);
  render(await PrintersPage());
  expect(summaries).toHaveBeenCalledWith("vendor-a");
  expect(
    screen.getByRole("link", { name: "Choose a printer" }),
  ).toHaveAttribute("href", "/dashboard/printers/new?location=a");
  expect(
    screen.getByRole("link", { name: "Open bridge mode" }),
  ).toHaveAttribute("href", "/dashboard/bridge?booth=booth-b");
  expect(screen.getByText("Printer B")).toBeInTheDocument();
  expect(screen.getByText("Offline")).toBeInTheDocument();
  const linkedRow = document.getElementById("booth-loc-b");
  expect(linkedRow).not.toBeNull();
  expect(linkedRow?.className).toContain("target:ring-2");
});
it("directs vendors without active booths to qkit", async () => {
  summaries.mockResolvedValue([]);
  render(await PrintersPage());
  expect(screen.getByText(/No booths have printing turned on/)).toBeVisible();
  expect(screen.getByText(/Pick your printer here/)).toBeVisible();
  expect(screen.getByText(/Print a test label/)).toBeVisible();
  expect(screen.queryByRole("link", { name: "qkit" })).toBeNull();
});
it("links to qkit in the empty state only when its address is set", async () => {
  vi.stubEnv("NEXT_PUBLIC_QKIT_URL", "https://qkit.test");
  summaries.mockResolvedValue([]);
  render(await PrintersPage());
  expect(screen.getByRole("link", { name: "qkit" })).toHaveAttribute(
    "href",
    "https://qkit.test",
  );
  vi.unstubAllEnvs();
});
const row = (connector: string, catalog: string, state: string) => ({
  location: { id: "loc-1", label: "Stall", source_ref: "stall" },
  printer: {
    display_name: "P",
    connector,
    catalog_id: catalog,
    last_seen_at: null,
  },
  state,
});
it.each([
  ["cloud_poll", "star-mc-label2", "Printer address", "setup?location"],
  ["vendor_cloud", "feie-fp-n20w", "Edit SN and KEY", "setup?location"],
  ["bridge", "niimbot-b1", "Open bridge mode", "/dashboard/bridge"],
])("shows the %s primary action", async (connector, catalog, label, href) => {
  summaries.mockResolvedValue([row(connector, catalog, "online")]);
  render(await PrintersPage());
  expect(
    screen.getByRole("link", { name: label }).getAttribute("href"),
  ).toContain(href);
  expect(screen.getByRole("link", { name: "View setup steps" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Design label" })).toHaveAttribute(
    "href",
    "/dashboard/printers/designer?location=loc-1",
  );
  expect(screen.getByRole("button", { name: "Remove printer" })).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Use a different printer" }),
  ).toBeTruthy();
});
it.each([
  ["cloud_poll", "star-mc-label2", /connected to WiFi/],
  ["vendor_cloud", "feie-fp-n20w", /has signal/],
  ["bridge", "niimbot-b1", /on the helper device/],
])("shows an offline hint for %s", async (connector, catalog, hint) => {
  summaries.mockResolvedValue([row(connector, catalog, "offline")]);
  render(await PrintersPage());
  expect(screen.getByText(hint)).toBeVisible();
});
it("shows the virtual printer its own offline hint, not the WiFi one", async () => {
  summaries.mockResolvedValue([row("cloud_poll", "virtual", "offline")]);
  render(await PrintersPage());
  expect(screen.getByText(/press Start for this booth/)).toBeVisible();
  expect(screen.queryByText(/connected to WiFi/)).toBeNull();
});
it("shows no offline hint for an online printer", async () => {
  summaries.mockResolvedValue([row("cloud_poll", "star-mc-label2", "online")]);
  render(await PrintersPage());
  expect(screen.queryByText(/connected to WiFi/)).toBeNull();
});
