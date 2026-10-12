import { describe, it, expect, vi, beforeEach } from "vitest";

const publicSiteUrlMock = vi.fn<() => string | null>();
vi.mock("@/lib/site-url", () => ({
  publicSiteUrl: () => publicSiteUrlMock(),
}));

import { locationManageUrl, locationRowId } from "./manage-url";

const REQUEST_ORIGIN = "http://localhost:3000";
const LOCATION = { id: "loc-1" };

beforeEach(() => {
  publicSiteUrlMock.mockReset().mockReturnValue("https://printkit.merqo.io");
});

describe("locationManageUrl", () => {
  it("sends a caller with no active location to the printers list", () => {
    expect(locationManageUrl(REQUEST_ORIGIN, null, false)).toBe(
      "https://printkit.merqo.io/dashboard/printers",
    );
  });

  it("sends a location with no printer to its picker", () => {
    expect(locationManageUrl(REQUEST_ORIGIN, LOCATION, false)).toBe(
      "https://printkit.merqo.io/dashboard/printers/new?location=loc-1",
    );
  });

  it("sends a location with a printer to its row on the printers list", () => {
    expect(locationManageUrl(REQUEST_ORIGIN, LOCATION, true)).toBe(
      "https://printkit.merqo.io/dashboard/printers#booth-loc-1",
    );
  });

  it("uses the request's origin when no public origin is configured", () => {
    publicSiteUrlMock.mockReturnValue(null);
    expect(locationManageUrl(REQUEST_ORIGIN, LOCATION, false)).toBe(
      "http://localhost:3000/dashboard/printers/new?location=loc-1",
    );
  });

  it("percent-encodes the location id", () => {
    expect(locationManageUrl(REQUEST_ORIGIN, { id: "a b&c" }, false)).toBe(
      "https://printkit.merqo.io/dashboard/printers/new?location=a%20b%26c",
    );
  });
});

describe("locationRowId", () => {
  it("names a location's row on the printers list", () => {
    expect(locationRowId("loc-1")).toBe("booth-loc-1");
  });
});
