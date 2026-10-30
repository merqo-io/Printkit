import { describe, it, expect, vi, beforeEach } from "vitest";

const getUser = vi.fn();
const maybeSingle = vi.fn();
const getPrinterByLocation = vi.fn();
const rasterizeLayout = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () =>
    Promise.resolve({
      auth: { getUser },
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle }) }),
      }),
    }),
}));
vi.mock("@/lib/printers", () => ({
  getPrinterByLocation: (...a: unknown[]) => getPrinterByLocation(...a),
}));
vi.mock("@/lib/label-raster", () => ({
  rasterizeLayout: (...a: unknown[]) => rasterizeLayout(...a),
}));

import { GET } from "./route";

const LOCATION = "00000000-0000-4000-8000-000000000001";

function req(location?: string) {
  const qs = location === undefined ? "" : `?location=${location}`;
  return new Request(`http://localhost/api/bridge/sample-label${qs}`);
}

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: "u1" } } });
  maybeSingle.mockReset().mockResolvedValue({ data: { id: LOCATION } });
  getPrinterByLocation.mockReset().mockResolvedValue(null);
  rasterizeLayout.mockReset().mockResolvedValue(Buffer.from([1, 2, 3]));
});

describe("GET /api/bridge/sample-label", () => {
  it("returns 401 without a session", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await GET(req(LOCATION))).status).toBe(401);
  });

  it.each([undefined, "not-a-uuid"])(
    "returns 400 and reads nothing for location %s",
    async (location) => {
      const res = await GET(req(location));
      expect(res.status).toBe(400);
      expect(maybeSingle).not.toHaveBeenCalled();
    },
  );

  it("returns 404 for an unknown booth", async () => {
    maybeSingle.mockResolvedValue({ data: null });
    expect((await GET(req(LOCATION))).status).toBe(404);
  });

  it("renders a png at 203 dpi when the booth has no printer", async () => {
    const res = await GET(req(LOCATION));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(rasterizeLayout).toHaveBeenCalledWith(expect.anything(), 203);
  });
  it("renders the 40 by 60 mm calibration sample using the printer renderer", async () => {
    const response = await GET(
      new Request(
        `http://localhost/api/bridge/sample-label?location=${LOCATION}&sample=b1-40x60`,
      ),
    );
    expect(response.status).toBe(200);
    expect(rasterizeLayout).toHaveBeenCalledWith(
      expect.objectContaining({ widthMm: 40, heightMm: 60 }),
      203,
    );
  });

  it("rejects unknown samples", async () => {
    const response = await GET(
      new Request(
        `http://localhost/api/bridge/sample-label?location=${LOCATION}&sample=unknown`,
      ),
    );
    expect(response.status).toBe(400);
    expect(rasterizeLayout).not.toHaveBeenCalled();
  });
});
