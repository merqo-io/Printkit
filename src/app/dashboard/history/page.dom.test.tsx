// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/vendor-session", () => ({
  getVendorSession: vi.fn().mockResolvedValue({
    supabase: {},
    user: { id: "vendor-1" },
  }),
}));
vi.mock("@/lib/print-history", async (importOriginal) => ({
  isHistoryCursor: (
    await importOriginal<typeof import("@/lib/print-history")>()
  ).isHistoryCursor,
  listPrintHistoryPage: vi
    .fn()
    .mockImplementation(async (_client, _vendor, options) => ({
      nextCursor: null,
      jobs: [
        {
          id: "job-1",
          vendor_id: "vendor-1",
          job_type: "label",
          location_id: "loc-1",
          print_locations: { label: "Kopitiam Cart" },
          payload: { customer_name: "Ada", order_number: "0007" },
          status: "printed",
          source_kit: "qkit",
          source_ref: "order-1",
          created_at: "2026-08-22T10:00:00Z",
          printed_at: "2026-08-22T10:00:05Z",
        },
        {
          id: "job-2",
          vendor_id: "vendor-1",
          job_type: "label",
          location_id: null,
          print_locations: null,
          payload: { customer_name: "Uma", order_number: "0008" },
          status: "queued",
          source_kit: "qkit",
          source_ref: "order-2",
          created_at: "2026-08-22T11:00:00Z",
          printed_at: null,
        },
      ].filter(
        (job) =>
          !options.unrouted ||
          (job.location_id === null && job.status === "queued"),
      ),
    })),
}));
vi.mock("@/lib/print-locations", () => ({
  listActiveLocations: vi.fn().mockResolvedValue([]),
}));

import { listPrintHistoryPage } from "@/lib/print-history";
import HistoryPage from "./page";

const validCursor = Buffer.from(
  JSON.stringify({
    createdAt: "2026-08-22T10:00:00Z",
    id: "00000000-0000-4000-8000-000000000001",
  }),
).toString("base64url");

describe("HistoryPage", () => {
  it("renders every row when the unrouted filter isn't applied", async () => {
    render(await HistoryPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("Uma")).toBeInTheDocument();
  });

  it("renders only unrouted, queued rows when ?unrouted=1 is present", async () => {
    render(
      await HistoryPage({ searchParams: Promise.resolve({ unrouted: "1" }) }),
    );
    expect(screen.queryByText("Ada")).not.toBeInTheDocument();
    expect(screen.getByText("Uma")).toBeInTheDocument();
  });
});

it("preserves the unrouted filter when browsing older jobs", async () => {
  vi.mocked(listPrintHistoryPage).mockResolvedValueOnce({
    jobs: [],
    nextCursor: "next-page",
  });
  render(
    await HistoryPage({ searchParams: Promise.resolve({ unrouted: "1" }) }),
  );
  expect(screen.getByRole("link", { name: "Older jobs" })).toHaveAttribute(
    "href",
    "/dashboard/history?unrouted=1&cursor=next-page",
  );
});

it("offers a return to the newest filtered page", async () => {
  render(
    await HistoryPage({
      searchParams: Promise.resolve({ unrouted: "1", cursor: validCursor }),
    }),
  );
  expect(screen.getByRole("link", { name: "Newest jobs" })).toHaveAttribute(
    "href",
    "/dashboard/history?unrouted=1",
  );
  expect(listPrintHistoryPage).toHaveBeenLastCalledWith({}, "vendor-1", {
    unrouted: true,
    cursor: validCursor,
  });
});

it("says when the unrouted filter is on and offers a way out", async () => {
  render(
    await HistoryPage({ searchParams: Promise.resolve({ unrouted: "1" }) }),
  );
  expect(
    screen.getByText(/showing only jobs that need a booth/i),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Show all jobs" })).toHaveAttribute(
    "href",
    "/dashboard/history",
  );
});

it.each([{}, { unrouted: "1" }])(
  "treats a malformed cursor as the newest page %o",
  async (filter) => {
    render(
      await HistoryPage({
        searchParams: Promise.resolve({ ...filter, cursor: "garbage" }),
      }),
    );
    expect(listPrintHistoryPage).toHaveBeenLastCalledWith({}, "vendor-1", {
      unrouted: "unrouted" in filter,
      cursor: undefined,
    });
    expect(
      screen.queryByRole("link", { name: "Newest jobs" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("No older jobs.")).not.toBeInTheDocument();
  },
);
