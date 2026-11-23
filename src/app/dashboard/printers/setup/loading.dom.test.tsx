// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import SetupLoading from "./loading";

it("announces that Setup is loading", () => {
  render(<SetupLoading />);
  expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
});
