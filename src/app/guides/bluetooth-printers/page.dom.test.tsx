// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

vi.mock("@/lib/nav-account", () => ({
  getNavAccount: vi.fn().mockResolvedValue(undefined),
}));

import BluetoothPrintersGuide from "./page";

it("frames the guide with the shared nav, footer and back-to-top button", async () => {
  render(await BluetoothPrintersGuide());
  expect(
    screen.getByRole("heading", { level: 1, name: "Bluetooth printers" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/login",
  );
  expect(
    screen.getByRole("button", { name: "Back to top", hidden: true }),
  ).toBeInTheDocument();
});

it("presents printkit as the print companion for qkit booths in plain copy", async () => {
  const { container } = render(await BluetoothPrintersGuide());
  const prose = container.cloneNode(true) as HTMLElement;
  prose.querySelectorAll("code").forEach((el) => el.remove());
  const copy = (prose.textContent ?? "").replace(/\s+/g, " ");
  expect(copy).toContain("for qkit booths");
  expect(copy).not.toMatch(/\$/);
  expect(copy).not.toContain("—");
  expect(copy).not.toMatch(
    /\b(live|now|available today|proven|tiers?|shopkit|reachkit|free|pro)\b/i,
  );
  expect(copy).not.toMatch(/Printkit|Qkit/);
});
