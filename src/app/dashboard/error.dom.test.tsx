// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardError from "./error";

describe("DashboardError", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("explains the problem and logs the caught error", () => {
    const error = Object.assign(new Error("boom"), { digest: "abc123" });
    render(<DashboardError error={error} reset={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: /something went wrong/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/we hit a snag loading this page/i),
    ).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Dashboard error boundary caught",
      error,
    );
  });

  it("calls reset() when Try again is clicked, and links back to the overview", async () => {
    const reset = vi.fn();
    const user = userEvent.setup();
    render(<DashboardError error={new Error("boom")} reset={reset} />);

    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("link", { name: /back to overview/i }),
    ).toHaveAttribute("href", "/dashboard");
  });
});
