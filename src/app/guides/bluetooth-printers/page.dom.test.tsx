// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import BluetoothPrintersGuide from "./page";

it("frames the guide with the shared nav, footer and back-to-top button", () => {
  render(<BluetoothPrintersGuide />);
  expect(
    screen.getByRole("heading", { level: 1, name: "Bluetooth printers" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
    "href",
    "/dashboard",
  );
  expect(
    screen.getByRole("button", { name: "Back to top", hidden: true }),
  ).toBeInTheDocument();
});

it("presents printkit as the print companion for qkit booths in plain copy", () => {
  const { container } = render(<BluetoothPrintersGuide />);
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
