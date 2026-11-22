// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import HistoryLoading from "./loading";

it("announces that History is loading", () => {
  render(<HistoryLoading />);
  expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
});
