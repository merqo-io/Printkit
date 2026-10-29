import { describe, it, expect, vi, beforeEach } from "vitest";

const insertMock = vi.fn();
const updateMock = vi.fn();
const rpcMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () =>
    Promise.resolve({
      rpc: rpcMock,
      from: () => ({
        insert: insertMock,
        update: updateMock,
      }),
    }),
}));

const dispatchJobMock = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/job-dispatch", () => ({
  dispatchJob: (...args: unknown[]) => dispatchJobMock(...args),
}));

const notifyKitPrintStatusMock = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/kit-callback", () => ({
  notifyKitPrintStatus: (...args: unknown[]) =>
    notifyKitPrintStatusMock(...args),
}));

const resolveActiveLocationMock = vi.fn();
const listActiveLocationsMock = vi.fn().mockResolvedValue([]);
vi.mock("@/lib/print-locations", () => ({
  resolveActiveLocation: (...args: unknown[]) =>
    resolveActiveLocationMock(...args),
  listActiveLocations: (...args: unknown[]) => listActiveLocationsMock(...args),
}));

import { createPrintJob, updatePrintJobStatus } from "./print-jobs";

describe("createPrintJob", () => {
  beforeEach(() => {
    insertMock.mockReset();
    resolveActiveLocationMock.mockReset();
    listActiveLocationsMock.mockReset().mockResolvedValue([]);
  });

  it("inserts a queued print_jobs row and returns its id", async () => {
    insertMock.mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: { id: "job-1" }, error: null }),
      }),
    });

    const result = await createPrintJob({
      vendorId: "vendor-1",
      payload: { customer_name: "Ada", order_number: "0007" },
      sourceKit: "qkit",
      sourceRef: "order-uuid-1",
    });

    expect(result).toEqual({ ok: true, id: "job-1" });
    expect(resolveActiveLocationMock).not.toHaveBeenCalled();
    expect(listActiveLocationsMock).toHaveBeenCalledWith("vendor-1");
    expect(insertMock).toHaveBeenCalledWith({
      vendor_id: "vendor-1",
      job_type: "label",
      payload: { customer_name: "Ada", order_number: "0007" },
      source_kit: "qkit",
      source_ref: "order-uuid-1",
      location_id: null,
    });
  });

  it("returns a 409 conflict result on a duplicate (source_kit, source_ref)", async () => {
    insertMock.mockReturnValue({
      select: () => ({
        single: () =>
          Promise.resolve({
            data: null,
            error: { code: "23505", message: "duplicate key value" },
          }),
      }),
    });

    const result = await createPrintJob({
      vendorId: "vendor-1",
      payload: { customer_name: "Ada", order_number: "0007" },
      sourceKit: "qkit",
      sourceRef: "order-uuid-1",
    });

    expect(result).toEqual({
      ok: false,
      status: 409,
      error: "A print job already exists for this order.",
    });
  });

  it("returns a 400 result on an unknown vendor_id (foreign key violation)", async () => {
    insertMock.mockReturnValue({
      select: () => ({
        single: () =>
          Promise.resolve({
            data: null,
            error: { code: "23503", message: "foreign key violation" },
          }),
      }),
    });

    const result = await createPrintJob({
      vendorId: "unknown-vendor",
      payload: { customer_name: "Ada", order_number: "0007" },
      sourceKit: "qkit",
      sourceRef: "order-uuid-1",
    });

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "Unknown vendor_id.",
    });
  });

  it("returns a 500 result on an unexpected database error", async () => {
    insertMock.mockReturnValue({
      select: () => ({
        single: () =>
          Promise.resolve({
            data: null,
            error: { code: "XXOOO", message: "connection reset" },
          }),
      }),
    });

    const result = await createPrintJob({
      vendorId: "vendor-1",
      payload: {},
      sourceKit: "qkit",
      sourceRef: "order-uuid-2",
    });

    expect(result).toEqual({
      ok: false,
      status: 500,
      error: "Could not create print job.",
    });
  });

  it("resolves locationRef to location_id when an active location matches", async () => {
    resolveActiveLocationMock.mockResolvedValue({
      id: "loc-1",
      vendorId: "vendor-1",
    });
    insertMock.mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: { id: "job-1" }, error: null }),
      }),
    });

    const result = await createPrintJob({
      vendorId: "vendor-1",
      payload: { customer_name: "Ada", order_number: "0007" },
      sourceKit: "qkit",
      sourceRef: "order-uuid-1",
      locationRef: "booth-1",
    });

    expect(result).toEqual({ ok: true, id: "job-1" });
    expect(resolveActiveLocationMock).toHaveBeenCalledWith("qkit", "booth-1");
    expect(insertMock).toHaveBeenCalledWith({
      vendor_id: "vendor-1",
      job_type: "label",
      payload: { customer_name: "Ada", order_number: "0007" },
      source_kit: "qkit",
      source_ref: "order-uuid-1",
      location_id: "loc-1",
    });
  });

  it("creates the job with location_id null when locationRef doesn't resolve", async () => {
    resolveActiveLocationMock.mockResolvedValue(null);
    insertMock.mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: { id: "job-1" }, error: null }),
      }),
    });

    const result = await createPrintJob({
      vendorId: "vendor-1",
      payload: { customer_name: "Ada", order_number: "0007" },
      sourceKit: "qkit",
      sourceRef: "order-uuid-1",
      locationRef: "unknown-booth",
    });

    expect(result).toEqual({ ok: true, id: "job-1" });
    expect(insertMock).toHaveBeenCalledWith({
      vendor_id: "vendor-1",
      job_type: "label",
      payload: { customer_name: "Ada", order_number: "0007" },
      source_kit: "qkit",
      source_ref: "order-uuid-1",
      location_id: null,
    });
  });

  it("creates the job with location_id null when resolveActiveLocation throws", async () => {
    resolveActiveLocationMock.mockRejectedValue(new Error("network down"));
    insertMock.mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: { id: "job-1" }, error: null }),
      }),
    });

    const result = await createPrintJob({
      vendorId: "vendor-1",
      payload: { customer_name: "Ada", order_number: "0007" },
      sourceKit: "qkit",
      sourceRef: "order-uuid-1",
      locationRef: "booth-1",
    });

    expect(result).toEqual({ ok: true, id: "job-1" });
    expect(insertMock).toHaveBeenCalledWith({
      vendor_id: "vendor-1",
      job_type: "label",
      payload: { customer_name: "Ada", order_number: "0007" },
      source_kit: "qkit",
      source_ref: "order-uuid-1",
      location_id: null,
    });
  });

  it("passes an explicit jobType through identically to omitting it", async () => {
    insertMock.mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: { id: "job-1" }, error: null }),
      }),
    });

    const result = await createPrintJob({
      vendorId: "vendor-1",
      payload: { customer_name: "Ada", order_number: "0007" },
      sourceKit: "qkit",
      sourceRef: "order-uuid-1",
      jobType: "label",
    });

    expect(result).toEqual({ ok: true, id: "job-1" });
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ job_type: "label" }),
    );
  });
});

describe("single-active-location auto-delivery fallback", () => {
  beforeEach(() => {
    insertMock.mockReset();
    resolveActiveLocationMock.mockReset();
    listActiveLocationsMock.mockReset().mockResolvedValue([]);
  });

  it("routes to the vendor's one active location when locationRef is omitted", async () => {
    listActiveLocationsMock.mockResolvedValue([
      { id: "loc-1", label: "Kopitiam Cart" },
    ]);
    insertMock.mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: { id: "job-1" }, error: null }),
      }),
    });

    const result = await createPrintJob({
      vendorId: "vendor-1",
      payload: { customer_name: "Ada", order_number: "0007" },
      sourceKit: "qkit",
      sourceRef: "order-uuid-1",
    });

    expect(result).toEqual({ ok: true, id: "job-1" });
    expect(listActiveLocationsMock).toHaveBeenCalledWith("vendor-1");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ location_id: "loc-1" }),
    );
  });

  it("stays unrouted when the vendor has two or more active locations", async () => {
    listActiveLocationsMock.mockResolvedValue([
      { id: "loc-1", label: "Kopitiam Cart" },
      { id: "loc-2", label: "Ice Cream Cart" },
    ]);
    insertMock.mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: { id: "job-1" }, error: null }),
      }),
    });

    const result = await createPrintJob({
      vendorId: "vendor-1",
      payload: { customer_name: "Ada", order_number: "0007" },
      sourceKit: "qkit",
      sourceRef: "order-uuid-1",
    });

    expect(result).toEqual({ ok: true, id: "job-1" });
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ location_id: null }),
    );
  });

  it("falls back to the vendor's one active location when locationRef doesn't resolve", async () => {
    resolveActiveLocationMock.mockResolvedValue(null);
    listActiveLocationsMock.mockResolvedValue([
      { id: "loc-1", label: "Kopitiam Cart" },
    ]);
    insertMock.mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: { id: "job-1" }, error: null }),
      }),
    });

    const result = await createPrintJob({
      vendorId: "vendor-1",
      payload: { customer_name: "Ada", order_number: "0007" },
      sourceKit: "qkit",
      sourceRef: "order-uuid-1",
      locationRef: "unknown-booth",
    });

    expect(result).toEqual({ ok: true, id: "job-1" });
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ location_id: "loc-1" }),
    );
  });

  it("still creates the job with location_id null when listActiveLocations itself throws", async () => {
    listActiveLocationsMock.mockRejectedValue(new Error("network down"));
    insertMock.mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: { id: "job-1" }, error: null }),
      }),
    });

    const result = await createPrintJob({
      vendorId: "vendor-1",
      payload: { customer_name: "Ada", order_number: "0007" },
      sourceKit: "qkit",
      sourceRef: "order-uuid-1",
    });

    expect(result).toEqual({ ok: true, id: "job-1" });
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ location_id: null }),
    );
  });
});

describe("resolveActiveLocation vendor-scoping", () => {
  beforeEach(() => {
    insertMock.mockReset();
    resolveActiveLocationMock.mockReset();
    listActiveLocationsMock.mockReset().mockResolvedValue([]);
  });

  it("treats a resolved location belonging to a different vendor as unresolved", async () => {
    resolveActiveLocationMock.mockResolvedValue({
      id: "loc-1",
      vendorId: "other-vendor",
    });
    // Zero other active locations for vendor-1 isolates this check from
    // the single-active-location fallback.
    listActiveLocationsMock.mockResolvedValue([]);
    insertMock.mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: { id: "job-1" }, error: null }),
      }),
    });

    const result = await createPrintJob({
      vendorId: "vendor-1",
      payload: { customer_name: "Ada", order_number: "0007" },
      sourceKit: "qkit",
      sourceRef: "order-uuid-1",
      locationRef: "booth-1",
    });

    expect(result).toEqual({ ok: true, id: "job-1" });
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ location_id: null }),
    );
  });
});

describe("updatePrintJobStatus", () => {
  beforeEach(() => {
    notifyKitPrintStatusMock.mockClear();
    updateMock.mockReset();
  });

  it("updates the row and notifies the calling kit when status is failed", async () => {
    updateMock.mockReturnValue({
      eq: () => ({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: {
                source_kit: "qkit",
                source_ref: "order-1",
                created_at: "2026-10-08T01:00:00.123456+00:00",
              },
              error: null,
            }),
        }),
      }),
    });

    const result = await updatePrintJobStatus("job-1", "failed");

    expect(result).toEqual({ ok: true });
    expect(notifyKitPrintStatusMock).toHaveBeenCalledWith(
      "qkit",
      "order-1",
      "failed",
      "2026-10-08T01:00:00.123456+00:00",
    );
  });

  it("does not notify the calling kit for a non-terminal status (queued/sent)", async () => {
    updateMock.mockReturnValue({
      eq: () => ({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: {
                source_kit: "qkit",
                source_ref: "order-1",
                created_at: "2026-10-08T01:00:00.123456+00:00",
              },
              error: null,
            }),
        }),
      }),
    });

    await updatePrintJobStatus("job-1", "sent");

    expect(notifyKitPrintStatusMock).not.toHaveBeenCalled();
  });

  it("notifies whichever kit created the job, not just qkit", async () => {
    updateMock.mockReturnValue({
      eq: () => ({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: {
                source_kit: "some-other-kit",
                source_ref: "ref-1",
                created_at: "2026-10-08T01:00:00.123456+00:00",
              },
              error: null,
            }),
        }),
      }),
    });

    await updatePrintJobStatus("job-1", "failed");

    expect(notifyKitPrintStatusMock).toHaveBeenCalledWith(
      "some-other-kit",
      "ref-1",
      "failed",
      "2026-10-08T01:00:00.123456+00:00",
    );
  });

  it("does not include printed_at in the update payload for a non-printed status", async () => {
    updateMock.mockReturnValue({
      eq: () => ({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: {
                source_kit: "qkit",
                source_ref: "order-1",
                created_at: "2026-10-08T01:00:00.123456+00:00",
              },
              error: null,
            }),
        }),
      }),
    });

    await updatePrintJobStatus("job-1", "failed");

    expect(updateMock).toHaveBeenCalledWith({
      status: "failed",
      failure_reason: null,
    });
  });

  it("restarts the expiry window and clears sent_at when a job is requeued", async () => {
    updateMock.mockReturnValue({
      eq: () => ({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: {
                source_kit: "qkit",
                source_ref: "order-1",
                created_at: "2026-10-08T01:00:00.123456+00:00",
              },
              error: null,
            }),
        }),
      }),
    });

    await updatePrintJobStatus("job-1", "queued");

    expect(updateMock).toHaveBeenCalledWith({
      status: "queued",
      failure_reason: null,
      requeued_at: expect.any(String),
      sent_at: null,
      driver_ref: null,
    });
  });

  it("records a failure reason when one is given", async () => {
    updateMock.mockReturnValue({
      eq: () => ({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: {
                source_kit: "qkit",
                source_ref: "order-1",
                created_at: "2026-10-08T01:00:00.123456+00:00",
              },
              error: null,
            }),
        }),
      }),
    });

    await updatePrintJobStatus("job-1", "failed", "expired");

    expect(updateMock).toHaveBeenCalledWith({
      status: "failed",
      failure_reason: "expired",
    });
  });

  it("sets printed_at on a printed status", async () => {
    updateMock.mockReturnValue({
      eq: () => ({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: {
                source_kit: "qkit",
                source_ref: "order-1",
                created_at: "2026-10-08T01:00:00.123456+00:00",
              },
              error: null,
            }),
        }),
      }),
    });

    await updatePrintJobStatus("job-1", "printed");

    expect(updateMock).toHaveBeenCalledWith({
      status: "printed",
      failure_reason: null,
      printed_at: expect.any(String),
    });
  });

  it("returns ok:false when the row isn't found", async () => {
    updateMock.mockReturnValue({
      eq: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    });

    const result = await updatePrintJobStatus("missing-job", "failed");

    expect(result).toEqual({
      ok: false,
      error: "Could not update print job status.",
    });
    expect(notifyKitPrintStatusMock).not.toHaveBeenCalled();
  });
});

describe("atomic device result predicates", () => {
  beforeEach(() => {
    updateMock.mockReset();
    notifyKitPrintStatusMock.mockClear();
  });

  it.each([true, false])(
    "rechecks location, attempt and state in the update (matched=%s)",
    async (matched) => {
      const query = {
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: matched
            ? {
                source_kit: "qkit",
                source_ref: "order-1",
                created_at: "2026-10-08T01:00:00.123456+00:00",
              }
            : null,
          error: null,
        }),
      };
      updateMock.mockReturnValue(query);
      const result = await updatePrintJobStatus("job-1", "printed", undefined, {
        locationId: "loc-1",
        expectedStatus: "sent",
        driverRef: "order-9",
      });
      expect(query.eq.mock.calls).toEqual([
        ["id", "job-1"],
        ["location_id", "loc-1"],
        ["status", "sent"],
        ["driver_ref", "order-9"],
      ]);
      expect(result.ok).toBe(matched);
      expect(notifyKitPrintStatusMock).toHaveBeenCalledTimes(matched ? 1 : 0);
    },
  );
});

it.each([null, "2026-10-08T00:00:00Z"])(
  "matches nullable attempt timestamps (%s)",
  async (timestamp) => {
    const query = {
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    updateMock.mockReturnValue(query);
    notifyKitPrintStatusMock.mockClear();
    const result = await updatePrintJobStatus("job-1", "failed", "expired", {
      sentAt: timestamp,
      requeuedAt: timestamp,
    });
    const filter = timestamp === null ? query.is : query.eq;
    expect(filter).toHaveBeenCalledWith("sent_at", timestamp);
    expect(filter).toHaveBeenCalledWith("requeued_at", timestamp);
    expect(result.ok).toBe(false);
    expect(notifyKitPrintStatusMock).not.toHaveBeenCalled();
  },
);

describe("label batches", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    dispatchJobMock.mockClear();
    notifyKitPrintStatusMock.mockClear();
    listActiveLocationsMock.mockResolvedValue([]);
  });
  it("creates atomically and dispatches every durable child", async () => {
    rpcMock.mockResolvedValue({
      data: [{ id: "batch", job_ids: ["one", "two", "three"] }],
      error: null,
    });
    expect(
      await createPrintJob({
        vendorId: "v",
        sourceKit: "qkit",
        sourceRef: "order",
        payload: {},
        jobType: "label_batch",
        labels: [
          { item_name: "Kopi" },
          { item_name: "Kopi" },
          { item_name: "Tea" },
        ],
      }),
    ).toEqual({ ok: true, id: "batch" });
    expect(rpcMock).toHaveBeenCalledWith(
      "create_label_batch",
      expect.objectContaining({
        p_source_ref: "order",
        p_labels: [
          { item_name: "Kopi" },
          { item_name: "Kopi" },
          { item_name: "Tea" },
        ],
      }),
    );
    expect(dispatchJobMock.mock.calls.map((call) => call[0])).toEqual([
      "one",
      "two",
      "three",
    ]);
  });
  it("resends the aggregate terminal callback when an identical batch is submitted again", async () => {
    rpcMock.mockImplementation(async (name) =>
      name === "create_label_batch"
        ? { data: [{ id: "batch", job_ids: ["one"] }], error: null }
        : {
            data: [
              {
                source_kit: "qkit",
                source_ref: "order",
                status: "printed",
                updated_at: "2026-10-29T00:00:00.000001Z",
              },
            ],
            error: null,
          },
    );
    await createPrintJob({
      vendorId: "v",
      sourceKit: "qkit",
      sourceRef: "order",
      payload: {},
      labels: [{ item_name: "Tea" }],
    });
    expect(notifyKitPrintStatusMock).toHaveBeenCalledWith(
      "qkit",
      "order",
      "printed",
      "2026-10-29T00:00:00.000001Z",
    );
  });
  it("does not dispatch on an atomic creation failure", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: "23514" } });
    expect(
      await createPrintJob({
        vendorId: "v",
        sourceKit: "qkit",
        sourceRef: "order",
        payload: {},
        labels: [{ item_name: "Tea" }],
      }),
    ).toMatchObject({ ok: false, status: 422 });
    expect(dispatchJobMock).not.toHaveBeenCalled();
  });
  it.each(["queued", "failed", "printed"])(
    "uses aggregate %s rather than the individual label status",
    async (status) => {
      const node = {
        eq: () => node,
        select: () => node,
        single: async () => ({ data: { batch_id: "batch" }, error: null }),
      };
      updateMock.mockReturnValue(node);
      rpcMock.mockResolvedValue({
        data: [
          {
            source_kit: "qkit",
            source_ref: "order",
            status,
            updated_at: "2026-10-29T00:00:00.000001Z",
          },
        ],
        error: null,
      });
      expect(await updatePrintJobStatus("one", "printed")).toEqual({
        ok: true,
      });
      if (status === "queued")
        expect(notifyKitPrintStatusMock).not.toHaveBeenCalled();
      else
        expect(notifyKitPrintStatusMock).toHaveBeenCalledWith(
          "qkit",
          "order",
          status,
          "2026-10-29T00:00:00.000001Z",
        );
    },
  );
  it("cannot report a successful label as a printed batch when aggregation fails", async () => {
    const node = {
      eq: () => node,
      select: () => node,
      single: async () => ({ data: { batch_id: "batch" }, error: null }),
    };
    updateMock.mockReturnValue(node);
    rpcMock.mockResolvedValue({ data: null, error: { message: "offline" } });
    expect(await updatePrintJobStatus("one", "printed")).toMatchObject({
      ok: false,
    });
    expect(notifyKitPrintStatusMock).not.toHaveBeenCalled();
  });
});
