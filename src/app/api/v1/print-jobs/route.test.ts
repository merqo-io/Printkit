import { describe, it, expect, vi, beforeEach } from "vitest";

const verifyKitAuthMock = vi.fn();
const createPrintJobMock = vi.fn();

vi.mock("@/lib/kit-auth", () => ({
  verifyKitAuth: (...args: unknown[]) => verifyKitAuthMock(...args),
}));
vi.mock("@/lib/print-jobs", () => ({
  createPrintJob: (...args: unknown[]) => createPrintJobMock(...args),
}));

const rpcMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => Promise.resolve({ rpc: rpcMock }),
}));

import { POST } from "./route";

function requestWith(body: unknown, authorization = "Bearer qkit:secret") {
  return new Request("https://printkit.test/api/v1/print-jobs", {
    method: "POST",
    headers: { authorization, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/print-jobs", () => {
  beforeEach(() => {
    verifyKitAuthMock.mockReset();
    createPrintJobMock.mockReset();
    rpcMock.mockReset().mockResolvedValue({ data: true, error: null });
  });

  it("answers 429 with Retry-After before touching auth when the IP is limited", async () => {
    rpcMock.mockResolvedValue({ data: false, error: null });
    const req = requestWith({});
    req.headers.set("x-real-ip", "203.0.113.9");

    const res = await POST(req);

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    expect(rpcMock).toHaveBeenCalledWith("check_rate_limit", {
      p_key: "kit-ip:203.0.113.9",
      p_limit: 300,
      p_window_seconds: 60,
    });
    expect(verifyKitAuthMock).not.toHaveBeenCalled();
  });

  it("answers 429 when the kit is over its own limit", async () => {
    verifyKitAuthMock.mockResolvedValue({ kitSlug: "qkit" });
    rpcMock.mockResolvedValue({ data: false, error: null });

    const res = await POST(requestWith({}));

    expect(res.status).toBe(429);
    expect(rpcMock).toHaveBeenCalledWith("check_rate_limit", {
      p_key: "kit:qkit",
      p_limit: 600,
      p_window_seconds: 60,
    });
    expect(createPrintJobMock).not.toHaveBeenCalled();
  });

  it("rejects source_ref and location_ref over 128 characters", async () => {
    verifyKitAuthMock.mockResolvedValue({ kitSlug: "qkit" });
    const base = {
      vendor_id: "11111111-1111-1111-8111-111111111111",
      payload: {},
    };
    const tooLong = "x".repeat(129);

    const a = await POST(requestWith({ ...base, source_ref: tooLong }));
    const b = await POST(
      requestWith({ ...base, source_ref: "ok", location_ref: tooLong }),
    );

    expect(a.status).toBe(400);
    expect(b.status).toBe(400);
    expect(createPrintJobMock).not.toHaveBeenCalled();
  });

  it("returns 401 when the bearer secret doesn't verify", async () => {
    verifyKitAuthMock.mockResolvedValue(null);

    const res = await POST(requestWith({}));

    expect(res.status).toBe(401);
    expect(createPrintJobMock).not.toHaveBeenCalled();
  });

  it("returns 400 on an invalid request body", async () => {
    verifyKitAuthMock.mockResolvedValue({ kitSlug: "qkit" });

    const res = await POST(requestWith({ vendor_id: "not-a-uuid" }));

    expect(res.status).toBe(400);
    expect(createPrintJobMock).not.toHaveBeenCalled();
  });

  it("passes location_ref through to createPrintJob as locationRef", async () => {
    verifyKitAuthMock.mockResolvedValue({ kitSlug: "qkit" });
    createPrintJobMock.mockResolvedValue({ ok: true, id: "job-1" });

    const res = await POST(
      requestWith({
        vendor_id: "11111111-1111-1111-8111-111111111111",
        payload: { customer_name: "Ada", order_number: "0007" },
        source_ref: "order-uuid-1",
        location_ref: "booth-1",
      }),
    );

    expect(res.status).toBe(201);
    expect(createPrintJobMock).toHaveBeenCalledWith({
      vendorId: "11111111-1111-1111-8111-111111111111",
      payload: { customer_name: "Ada", order_number: "0007" },
      sourceKit: "qkit",
      sourceRef: "order-uuid-1",
      locationRef: "booth-1",
    });
  });

  it("creates a print job when location_ref is omitted (backward compatibility)", async () => {
    verifyKitAuthMock.mockResolvedValue({ kitSlug: "qkit" });
    createPrintJobMock.mockResolvedValue({ ok: true, id: "job-1" });

    const res = await POST(
      requestWith({
        vendor_id: "11111111-1111-1111-8111-111111111111",
        payload: { customer_name: "Ada", order_number: "0007" },
        source_ref: "order-uuid-1",
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ id: "job-1" });
    expect(createPrintJobMock).toHaveBeenCalledWith({
      vendorId: "11111111-1111-1111-8111-111111111111",
      payload: { customer_name: "Ada", order_number: "0007" },
      sourceKit: "qkit",
      sourceRef: "order-uuid-1",
      locationRef: undefined,
    });
  });

  it("passes job_type through to createPrintJob as jobType", async () => {
    verifyKitAuthMock.mockResolvedValue({ kitSlug: "qkit" });
    createPrintJobMock.mockResolvedValue({ ok: true, id: "job-1" });

    const res = await POST(
      requestWith({
        vendor_id: "11111111-1111-1111-8111-111111111111",
        payload: { customer_name: "Ada", order_number: "0007" },
        source_ref: "order-uuid-1",
        job_type: "label",
      }),
    );

    expect(res.status).toBe(201);
    expect(createPrintJobMock).toHaveBeenCalledWith(
      expect.objectContaining({ jobType: "label" }),
    );
  });

  it("returns the createPrintJob error status/message on failure (e.g. 409 duplicate)", async () => {
    verifyKitAuthMock.mockResolvedValue({ kitSlug: "qkit" });
    createPrintJobMock.mockResolvedValue({
      ok: false,
      status: 409,
      error: "A print job already exists for this order.",
    });

    const res = await POST(
      requestWith({
        vendor_id: "11111111-1111-1111-8111-111111111111",
        payload: {},
        source_ref: "order-uuid-1",
      }),
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body).toEqual({
      error: "A print job already exists for this order.",
    });
  });
});

describe("batch API boundary", () => {
  beforeEach(() => {
    verifyKitAuthMock.mockResolvedValue({ kitSlug: "qkit" });
    createPrintJobMock.mockReset().mockResolvedValue({ ok: true, id: "batch" });
  });
  const body = {
    vendor_id: "11111111-1111-4111-8111-111111111111",
    source_ref: "order",
    payload: { customer_name: "Ann", order_number: "007" },
  };
  it("passes every unit through without collapsing identical drinks", async () => {
    const labels = [
      { item_name: "Kopi" },
      { item_name: "Kopi" },
      { item_name: "Tea" },
    ];
    expect(
      (await POST(requestWith({ ...body, job_type: "label_batch", labels })))
        .status,
    ).toBe(201);
    expect(createPrintJobMock).toHaveBeenCalledWith(
      expect.objectContaining({ labels, jobType: "label_batch" }),
    );
  });
  it.each([
    { job_type: "label_batch" },
    { labels: [{ item_name: "Kopi" }] },
    { job_type: "label_batch", labels: [] },
    {
      job_type: "label_batch",
      labels: Array.from({ length: 101 }, () => ({ item_name: "Kopi" })),
    },
  ])("rejects incomplete or oversized batches", async (invalid) => {
    expect((await POST(requestWith({ ...body, ...invalid }))).status).toBe(400);
    expect(createPrintJobMock).not.toHaveBeenCalled();
  });
  it("bounds the full request body before parsing", async () => {
    expect(
      (
        await POST(
          requestWith({ ...body, payload: { text: "x".repeat(65536) } }),
        )
      ).status,
    ).toBe(413);
    expect(createPrintJobMock).not.toHaveBeenCalled();
  });
});
