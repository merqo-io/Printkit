import { describe, it, expect, afterEach } from "vitest";
import { bearerOk } from "./merqo-auth";

function reqWithAuth(header?: string) {
  return new Request("http://localhost/x", {
    headers: header ? { Authorization: header } : {},
  });
}

describe("bearerOk", () => {
  afterEach(() => {
    delete process.env.MERQO_METRICS_SECRET;
  });

  it("rejects when MERQO_METRICS_SECRET is unset", () => {
    expect(bearerOk(reqWithAuth("Bearer anything"))).toBe(false);
  });

  it("rejects a missing Authorization header", () => {
    process.env.MERQO_METRICS_SECRET = "s1";
    expect(bearerOk(reqWithAuth())).toBe(false);
  });

  it("rejects a non-bearer scheme", () => {
    process.env.MERQO_METRICS_SECRET = "s1";
    expect(bearerOk(reqWithAuth("Basic s1"))).toBe(false);
  });

  it("rejects a wrong secret", () => {
    process.env.MERQO_METRICS_SECRET = "s1";
    expect(bearerOk(reqWithAuth("Bearer wrong"))).toBe(false);
  });

  it("accepts the correct secret", () => {
    process.env.MERQO_METRICS_SECRET = "s1";
    expect(bearerOk(reqWithAuth("Bearer s1"))).toBe(true);
  });
});
