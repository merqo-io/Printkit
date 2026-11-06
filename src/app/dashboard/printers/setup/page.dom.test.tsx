// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("@/lib/vendor-session", () => ({
  getVendorSession: async () => ({ user: { id: "vendor-1" } }),
}));
vi.mock("@/lib/print-locations", () => ({
  listActiveLocations: async () => [
    { id: "loc-1", label: "Stall", source_ref: "stall" },
  ],
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not found");
  },
}));
vi.mock("./setup-wizard", () => ({
  CloudPollSetup: () => null,
  VendorCloudSetup: () => null,
  BridgeSetup: () => null,
}));
vi.mock("@/components/page-header", () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

import PrinterSetupPage from "./page";

afterEach(() => vi.clearAllMocks());

async function titleFor(model: string) {
  render(
    await PrinterSetupPage({
      searchParams: Promise.resolve({ location: "loc-1", model }),
    }),
  );
  return screen.getByRole("heading", { level: 1 }).textContent;
}

it("names a real printer by brand and model", async () => {
  expect(await titleFor("niimbot-b1")).toMatch(/^Set up the NIIMBOT /);
});

it("names the virtual printer without a brand", async () => {
  expect(await titleFor("virtual")).toBe("Set up the Virtual printer");
});
