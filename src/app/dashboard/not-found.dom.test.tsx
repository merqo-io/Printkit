// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import DashboardNotFound from "./not-found";

it("links back to the dashboard overview", () => {
  render(<DashboardNotFound />);
  expect(
    screen.getByRole("link", { name: "Back to overview" }),
  ).toHaveAttribute("href", "/dashboard");
});
