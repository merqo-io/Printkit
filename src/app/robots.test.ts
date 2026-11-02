import { afterEach, describe, it, expect, vi } from "vitest";
import robots from "./robots";

afterEach(() => vi.unstubAllEnvs());

describe("robots", () => {
  it.each(["preview", "production"])("disallows everything in %s", (env) => {
    vi.stubEnv("VERCEL_ENV", env);
    expect(robots().rules).toEqual({ userAgent: "*", disallow: "/" });
  });
});
