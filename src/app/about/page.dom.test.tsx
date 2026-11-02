// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import AboutPage from "./page";

it("renders the real about copy for printkit and points at printer setup", () => {
  const { container } = render(<AboutPage />);
  const copy = (container.textContent ?? "").replace(/\s+/g, " ");
  expect(copy).toContain("printkit");
  expect(
    screen.getByRole("link", { name: "Set up a printer" }),
  ).toHaveAttribute("href", "/dashboard/printers");
  expect(copy).not.toMatch(/\$/);
  expect(copy).not.toContain("—");
  expect(copy).not.toMatch(
    /\b(live|now|available today|proven|tiers|shopkit|reachkit)\b/i,
  );
});
