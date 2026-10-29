import { describe, it, expect } from "vitest";
import { vendorActivityPayloadSchema } from "@merqo/ui/contracts";
import { computeVendorActivity } from "./merqo-vendor-activity";

const base = {
  printerCount: 1,
  jobs30d: 10,
  failed30d: 0,
  lastJobAt: "2026-10-29T10:00:00.000Z",
};
const noIncidents = { incidents: [], recent: [] };

describe("computeVendorActivity", () => {
  it("is inactive with no printer and no jobs", () => {
    const out = computeVendorActivity(
      { printerCount: 0, jobs30d: 0, failed30d: 0, lastJobAt: null },
      noIncidents,
    );
    expect(out).toEqual({
      active: false,
      plan: null,
      status: null,
      metrics: [],
      lastActivityAt: null,
      incidents: [],
      recent: [],
    });
    expect(vendorActivityPayloadSchema.safeParse(out).success).toBe(true);
  });

  it("is healthy with a printer and steady successful jobs", () => {
    const out = computeVendorActivity(base, noIncidents);
    expect(out.active).toBe(true);
    expect(out.plan).toBeNull();
    expect(out.status).toBe("healthy");
    expect(out.lastActivityAt).toBe(base.lastJobAt);
    expect(out.metrics).toEqual([
      { label: "Printers", value: "1" },
      { label: "Print jobs (30d)", value: "10" },
      { label: "Failure rate (30d)", value: "0%" },
    ]);
  });

  it("is stuck when any job is stuck, ahead of every other band", () => {
    const out = computeVendorActivity(
      { ...base, failed30d: 9 },
      {
        incidents: [
          { kind: "print_stuck", count: 1, lastAt: "2026-10-29T11:00:00Z" },
        ],
        recent: [],
      },
    );
    expect(out.status).toBe("stuck");
  });

  it("needs attention at a 20% failure rate", () => {
    expect(
      computeVendorActivity({ ...base, failed30d: 2 }, noIncidents).status,
    ).toBe("attention");
    expect(
      computeVendorActivity({ ...base, failed30d: 1 }, noIncidents).status,
    ).toBe("healthy");
  });

  it("is new with a printer but no job yet", () => {
    const out = computeVendorActivity(
      { printerCount: 2, jobs30d: 0, failed30d: 0, lastJobAt: null },
      noIncidents,
    );
    expect(out.status).toBe("new");
  });

  it("is quiet with no job in 30 days", () => {
    const out = computeVendorActivity(
      { ...base, jobs30d: 0, lastJobAt: "2026-08-01T00:00:00.000Z" },
      noIncidents,
    );
    expect(out.status).toBe("quiet");
  });

  it("omits incidents and recent when the summary is unavailable", () => {
    const out = computeVendorActivity(base, null);
    expect(out).not.toHaveProperty("incidents");
    expect(out).not.toHaveProperty("recent");
  });

  it("keeps metrics for a vendor with past jobs but no printer now", () => {
    const out = computeVendorActivity(
      { ...base, printerCount: 0 },
      noIncidents,
    );
    expect(out.active).toBe(false);
    expect(out.status).toBeNull();
    expect(out.metrics[0]).toEqual({ label: "Printers", value: "0" });
  });
});
