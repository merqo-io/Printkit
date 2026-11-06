import { afterEach, describe, expect, it } from "vitest";
import { merqoBaseUrl, merqoUpgradeUrl } from "./merqo-url";

const original = process.env.MERQO_BASE_URL;

afterEach(() => {
  if (original === undefined) delete process.env.MERQO_BASE_URL;
  else process.env.MERQO_BASE_URL = original;
});

describe("merqoBaseUrl", () => {
  it("falls back to the production site when the env var is unset", () => {
    delete process.env.MERQO_BASE_URL;
    expect(merqoBaseUrl()).toBe("https://www.merqo.io");
    expect(merqoUpgradeUrl()).toBe("https://www.merqo.io/dashboard");
  });

  it("uses MERQO_BASE_URL when set", () => {
    process.env.MERQO_BASE_URL = "https://staging.merqo.io";
    expect(merqoBaseUrl()).toBe("https://staging.merqo.io");
    expect(merqoUpgradeUrl()).toBe("https://staging.merqo.io/dashboard");
  });
});
