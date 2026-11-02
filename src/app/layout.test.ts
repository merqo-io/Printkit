import { describe, it, expect, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Fraunces: () => ({ variable: "--font-fraunces" }),
  Inter: () => ({ variable: "--font-inter" }),
  JetBrains_Mono: () => ({ variable: "--font-jetbrains-mono" }),
}));

const { metadata } = await import("./layout");

describe("root layout metadata", () => {
  it("titles every page through a lowercase printkit template", () => {
    expect(metadata.title).toEqual({
      default: "printkit",
      template: "%s | printkit",
    });
  });

  it("keeps the whole site out of search indexes", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("describes printkit as the print companion for qkit booths", () => {
    expect(metadata.description).toMatch(/for qkit booths/);
  });
});
