// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import NotFound from "./not-found";

it("explains a dead link and offers a way back to printers", () => {
  render(<NotFound />);
  expect(
    screen.getByRole("heading", { name: "Page not found" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Go to printers" })).toHaveAttribute(
    "href",
    "/dashboard/printers",
  );
});
