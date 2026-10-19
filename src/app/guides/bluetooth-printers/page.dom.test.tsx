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
