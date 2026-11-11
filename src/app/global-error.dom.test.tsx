// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import GlobalErrorPage from "./global-error";

it("offers a retry that calls Next's retry()", async () => {
  const retry = vi.fn();
  const user = userEvent.setup();
  render(<GlobalErrorPage retry={retry} />);

  await user.click(screen.getByRole("button", { name: /try again/i }));
  expect(retry).toHaveBeenCalledTimes(1);
});
