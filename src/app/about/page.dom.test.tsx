// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

vi.mock("@/lib/nav-account", () => ({
  getNavAccount: vi.fn().mockResolvedValue(undefined),
}));

import AboutPage from "./page";

it("renders the real about copy for printkit and points at the public printer guide", async () => {
  const { container } = render(await AboutPage());
  const copy = (container.textContent ?? "").replace(/\s+/g, " ");
  expect(copy).toContain("printkit");
  expect(
    screen.getByRole("link", { name: "Read the Bluetooth printer guide" }),
  ).toHaveAttribute("href", "/guides/bluetooth-printers");
  expect(
    screen.queryByRole("link", { name: "Set up a printer" }),
  ).not.toBeInTheDocument();
  expect(copy).not.toMatch(/\$/);
  expect(copy).not.toContain("—");
  expect(copy).not.toMatch(
    /\b(live|now|available today|proven|tiers|shopkit|reachkit)\b/i,
  );
});
