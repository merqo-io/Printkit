// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getCatalogEntry } from "@/lib/printer-catalog";
import { CloudPollSetup } from "./cloud-poll-setup";

const m = vi.hoisted(() => ({ url: vi.fn(), state: vi.fn(), test: vi.fn() }));
vi.mock("./actions", () => ({
  createPrinterUrl: m.url,
  readPrinterState: m.state,
}));
vi.mock("../actions", () => ({ sendTestPrint: m.test }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function entry(id: string) {
  const result = getCatalogEntry(id);
  if (!result) throw new Error(`Missing catalog fixture ${id}`);
  return result;
}

beforeEach(() => {
  vi.resetAllMocks();
  m.state.mockResolvedValue("offline");
});
afterEach(cleanup);

it("gives the virtual printer its own steps without CloudPRNT or WiFi copy", async () => {
  render(<CloudPollSetup entry={entry("virtual")} locationId="location" />);
  expect(
    screen.getByRole("link", { name: "Open the virtual printer." }),
  ).toHaveAttribute("href", "/dashboard/dev/virtual-printer");
  expect(screen.getByText(/Start virtual printer/)).toBeVisible();
  expect(screen.queryByText(/CloudPRNT/)).toBeNull();
  expect(screen.queryByText(/WiFi/)).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Create the address" }),
  ).toBeNull();
  expect(await screen.findByText(/Waiting for your printer/)).toBeVisible();
});

it("keeps the CloudPRNT steps for a Star printer", async () => {
  render(
    <CloudPollSetup entry={entry("star-mc-label2")} locationId="location" />,
  );
  expect(
    screen.getByRole("button", { name: "Create the address" }),
  ).toBeVisible();
  expect(screen.getByText(/Turn CloudPRNT on/)).toBeVisible();
  expect(screen.getByText(/same WiFi/)).toBeVisible();
  expect(screen.queryByRole("link", { name: /virtual printer/i })).toBeNull();
  expect(await screen.findByText(/Waiting for your printer/)).toBeVisible();
});
