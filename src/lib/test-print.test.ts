import { describe, expect, it } from "vitest";
import { TEST_PRINT_SOURCE_KIT } from "./test-print";

describe("TEST_PRINT_SOURCE_KIT", () => {
  // scripts/create-kit-key-input.mjs hardcodes this slug as reserved.
  it("matches the slug reserved in create-kit-key", () => {
    expect(TEST_PRINT_SOURCE_KIT).toBe("printkit-test");
  });
});
