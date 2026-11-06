// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import NotFound from "./not-found";

it("explains a dead link and offers a way back to the overview", () => {
  render(<NotFound />);
  expect(
    screen.getByRole("heading", { name: "Page not found" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Back to overview" }),
  ).toHaveAttribute("href", "/dashboard");
});
