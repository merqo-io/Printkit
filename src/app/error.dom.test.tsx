// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RootError from "./error";

describe("RootError", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("shows the branded error message and logs the caught error", () => {
    const error = Object.assign(new Error("boom"), { digest: "xyz789" });
    render(<RootError error={error} retry={vi.fn()} reset={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: /something went wrong/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/we hit a snag loading this page/i),
    ).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Root error boundary caught",
      error,
    );
  });

  it("calls retry(), not reset(), when Try again is clicked, and links back home", async () => {
    const retry = vi.fn();
    const reset = vi.fn();
    const user = userEvent.setup();
    render(<RootError error={new Error("boom")} retry={retry} reset={reset} />);

    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(reset).not.toHaveBeenCalled();

    const homeLink = screen.getByRole("link", { name: /back to home/i });
    expect(homeLink).toHaveAttribute("href", "/");
  });
});
