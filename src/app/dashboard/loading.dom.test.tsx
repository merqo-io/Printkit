// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import DashboardLoading from "./loading";

it("announces that the dashboard is loading", () => {
  render(<DashboardLoading />);
  expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
});
