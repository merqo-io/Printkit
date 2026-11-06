// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ test: vi.fn() }));
vi.mock("./actions", () => ({ sendTestPrint: m.test }));

import { TestPrintButton } from "./test-print-button";

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

it("links the upgrade phrase to the Merqo dashboard when labels are blocked", async () => {
  m.test.mockResolvedValue({
    ok: false,
    error: "Needs a plan. Upgrade in your Merqo account to print labels.",
    upgradeUrl: "https://www.merqo.io/dashboard",
  });
  render(<TestPrintButton locationId="loc-1" />);
  await userEvent.click(
    screen.getByRole("button", { name: "Print test label" }),
  );
  const link = await screen.findByRole("link", {
    name: "Upgrade in your Merqo account",
  });
  expect(link).toHaveAttribute("href", "https://www.merqo.io/dashboard");
});

it("shows other errors as plain text", async () => {
  m.test.mockResolvedValue({ ok: false, error: "Could not send." });
  render(<TestPrintButton locationId="loc-1" />);
  await userEvent.click(
    screen.getByRole("button", { name: "Print test label" }),
  );
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent("Could not send."),
  );
  expect(screen.queryByRole("link")).toBeNull();
});
