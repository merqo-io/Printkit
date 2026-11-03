import { describe, it, expect, afterEach } from "vitest";
import { bearerOk, provisionBearerOk } from "./merqo-auth";

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

describe("provisionBearerOk", () => {
  afterEach(() => {
    delete process.env.MERQO_PROVISION_SECRET;
    delete process.env.MERQO_METRICS_SECRET;
  });

  it("rejects when MERQO_PROVISION_SECRET is unset", () => {
    expect(provisionBearerOk(reqWithAuth("Bearer anything"))).toBe(false);
  });

  it("accepts the provision secret and rejects the metrics secret", () => {
    process.env.MERQO_PROVISION_SECRET = "p1";
    process.env.MERQO_METRICS_SECRET = "m1";
    expect(provisionBearerOk(reqWithAuth("Bearer p1"))).toBe(true);
    expect(provisionBearerOk(reqWithAuth("Bearer m1"))).toBe(false);
  });
});
