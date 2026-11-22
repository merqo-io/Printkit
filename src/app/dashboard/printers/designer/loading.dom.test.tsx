// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import DesignerLoading from "./loading";

it("announces that Designer is loading", () => {
  render(<DesignerLoading />);
  expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
});
