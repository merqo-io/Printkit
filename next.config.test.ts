import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

describe("next.config redirects", () => {
  it("permanently moves the old virtual printer path", async () => {
    const redirects = await nextConfig.redirects?.();
    expect(redirects).toContainEqual({
      source: "/dashboard/dev/virtual-printer",
      destination: "/dashboard/printers/virtual",
      permanent: true,
    });
  });
});
