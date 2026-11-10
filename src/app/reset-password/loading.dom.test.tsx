// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import ResetPasswordLoading from "./loading";

it("announces that the reset page is loading", () => {
  render(<ResetPasswordLoading />);
  expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
});
