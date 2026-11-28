// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import PrintersLoading from "./loading";

it("announces that Printers is loading", () => {
  render(<PrintersLoading />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading");
});
