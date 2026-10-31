// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/vendor-session", () => ({
  getVendorSession: vi
    .fn()
    .mockResolvedValue({ supabase: {}, user: { id: "vendor-1" } }),
}));
vi.mock("@/lib/print-jobs-list", () => ({
  listPrintJobs: vi.fn().mockResolvedValue([]),
  countUnroutedJobs: vi.fn().mockResolvedValue(0),
}));
vi.mock("@/lib/location-printer-summaries", () => ({
  listLocationPrinterSummaries: vi.fn().mockResolvedValue([]),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { listLocationPrinterSummaries } from "@/lib/location-printer-summaries";
import {
  countUnroutedJobs,
  listPrintJobs,
  type PrintJob,
} from "@/lib/print-jobs-list";
import DashboardPage from "./page";

function booth(state: "online" | "offline" | "not_set_up") {
  return {
    location: { id: "loc-1", label: "Kopitiam Cart", source_ref: "booth-1" },
    printer: {
      location_id: "loc-1",
      display_name: "Feie FP-N20H",
      connector: "vendor_cloud",
      catalog_id: "feie-fp-n20h",
      last_seen_at: new Date().toISOString(),
    },
    state,
  };
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.mocked(listLocationPrinterSummaries).mockReset().mockResolvedValue([]);
    vi.mocked(countUnroutedJobs).mockReset().mockResolvedValue(0);
    vi.mocked(listPrintJobs).mockReset().mockResolvedValue([]);
  });

  it("reports each booth's printer and its live state", async () => {
    vi.mocked(listLocationPrinterSummaries).mockResolvedValue([
      {
        location: {
          id: "loc-1",
          label: "Kopitiam Cart",
          source_ref: "booth-1",
        },
        printer: {
          location_id: "loc-1",
          display_name: "Feie FP-N20H",
          connector: "vendor_cloud",
          catalog_id: "feie-fp-n20h",
          last_seen_at: new Date().toISOString(),
        },
        state: "online",
      },
      {
        location: {
          id: "loc-2",
          label: "Ice Cream Cart",
          source_ref: "booth-2",
        },
        printer: null,
        state: "not_set_up",
      },
    ]);

    render(await DashboardPage());

    expect(screen.getByText("Kopitiam Cart")).toBeInTheDocument();
    expect(screen.getByText("Feie FP-N20H")).toBeInTheDocument();
    expect(screen.getByText(/printer connected/i)).toBeInTheDocument();
    expect(screen.getByText("Ice Cream Cart")).toBeInTheDocument();
    expect(screen.getByText(/no printer yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/connected to qkit/i)).not.toBeInTheDocument();
  });

  it("reports a printer that has gone quiet as offline", async () => {
    vi.mocked(listLocationPrinterSummaries).mockResolvedValue([
      {
        location: {
          id: "loc-1",
          label: "Kopitiam Cart",
          source_ref: "booth-1",
        },
        printer: {
          location_id: "loc-1",
          display_name: "Star mC-Label2",
          connector: "cloud_poll",
          catalog_id: "star-mc-label2",
          last_seen_at: "2026-01-01T16:30:00Z",
        },
        state: "offline",
      },
    ]);

    render(await DashboardPage());

    expect(screen.getByText(/offline since/i)).toBeInTheDocument();
  });

  it("shows the first-run steps when there are no active locations", async () => {
    vi.mocked(listLocationPrinterSummaries).mockResolvedValue([]);
    render(await DashboardPage());
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText(/turn on printing for your booth/i)).toBeVisible();
    expect(
      screen.queryByText(/no booths have printing/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Booths" })).toBeNull();
  });

  it("marks the booth and printer steps done and keeps the panel until a label printed", async () => {
    vi.mocked(listLocationPrinterSummaries).mockResolvedValue([
      booth("online"),
    ]);
    render(await DashboardPage());
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("(done)");
    expect(items[1]).toHaveTextContent("(done)");
    expect(items[2]).toHaveTextContent("(next)");
  });

  it("hides the first-run panel once a job has printed", async () => {
    vi.mocked(listLocationPrinterSummaries).mockResolvedValue([
      booth("online"),
    ]);
    vi.mocked(listPrintJobs).mockResolvedValue([
      { id: "j1", status: "printed" } as PrintJob,
    ]);
    render(await DashboardPage());
    expect(
      screen.queryByRole("heading", { name: /first label/i }),
    ).not.toBeInTheDocument();
  });

  it("links each booth to its label designer", async () => {
    vi.mocked(listLocationPrinterSummaries).mockResolvedValue([
      booth("online"),
    ]);
    render(await DashboardPage());
    expect(screen.getByRole("link", { name: "Design label" })).toHaveAttribute(
      "href",
      "/dashboard/printers/designer?location=loc-1",
    );
  });

  it("shows the empty history state when there are no recent jobs", async () => {
    render(await DashboardPage());
    expect(screen.getByText(/no print jobs yet/i)).toBeInTheDocument();
  });

  it("hides the unrouted-jobs callout when the count is zero", async () => {
    vi.mocked(countUnroutedJobs).mockResolvedValue(0);
    render(await DashboardPage());
    expect(screen.queryByText(/needs a booth/i)).not.toBeInTheDocument();
  });

  it("shows the callout linking to filtered history when the count is positive", async () => {
    vi.mocked(countUnroutedJobs).mockResolvedValue(3);
    render(await DashboardPage());
    const link = screen.getByText(/needs a booth \(3\)/i);
    expect(link.closest("a")).toHaveAttribute(
      "href",
      "/dashboard/history?unrouted=1",
    );
  });

  it.each([
    [
      1,
      "Needs a booth (1) This order has no booth yet, so it did not print. Choose a booth for it.",
    ],
    [
      3,
      "Needs a booth (3) These orders have no booth yet, so they did not print. Choose a booth for each.",
    ],
  ])("agrees the callout with a count of %i", async (count, sentence) => {
    vi.mocked(countUnroutedJobs).mockResolvedValue(count);
    render(await DashboardPage());
    expect(
      screen.getByText(
        (_content, element) =>
          element?.tagName === "P" && element.textContent === sentence,
      ),
    ).toBeInTheDocument();
  });
});
