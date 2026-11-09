import { afterEach, describe, expect, it } from "vitest";
import { merqoUpgradeUrl } from "./upgrade-url";

const original = process.env.MERQO_BASE_URL;

afterEach(() => {
  if (original === undefined) delete process.env.MERQO_BASE_URL;
  else process.env.MERQO_BASE_URL = original;
});

describe("merqoUpgradeUrl", () => {
  it("falls back to the production dashboard when the env var is unset", () => {
    delete process.env.MERQO_BASE_URL;
    expect(merqoUpgradeUrl()).toBe("https://www.merqo.io/dashboard");
  });

  it("uses MERQO_BASE_URL when set", () => {
    process.env.MERQO_BASE_URL = "https://staging.merqo.io";
    expect(merqoUpgradeUrl()).toBe("https://staging.merqo.io/dashboard");
  });
});
