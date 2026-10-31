// @vitest-environment jsdom
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  remove: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}));
vi.mock("./actions", () => ({ removePrinter: m.remove }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: m.push, refresh: m.refresh }),
}));
vi.mock("sonner", () => ({ toast: { error: m.error, success: m.success } }));

import { PrinterActions } from "./printer-actions";

const props = {
  locationId: "loc-1",
  boothRef: "stall",
  boothLabel: "Stall",
  catalogId: "star-mc-label2",
  connector: "cloud_poll",
};

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

it("asks before removing and says what happens to waiting orders", async () => {
  const user = userEvent.setup();
  render(<PrinterActions {...props} />);
  await user.click(screen.getByRole("button", { name: "Remove printer" }));
  const dialog = screen.getByRole("alertdialog");
  expect(dialog).toHaveTextContent(/unpaired/);
  expect(dialog).toHaveTextContent(/30 minutes/);
  expect(m.remove).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Keep it" }));
  expect(screen.queryByRole("alertdialog")).toBeNull();
});

it("removes the printer and refreshes the list", async () => {
  const user = userEvent.setup();
  m.remove.mockResolvedValue({ ok: true });
  render(<PrinterActions {...props} />);
  await user.click(screen.getByRole("button", { name: "Remove printer" }));
  await user.click(
    within(screen.getByRole("alertdialog")).getByRole("button", {
      name: "Remove printer",
    }),
  );
  await waitFor(() => expect(m.refresh).toHaveBeenCalled());
  expect(m.remove).toHaveBeenCalledWith("loc-1");
});

it("sends the vendor to the picker after changing printer", async () => {
  const user = userEvent.setup();
  m.remove.mockResolvedValue({ ok: true });
  render(<PrinterActions {...props} />);
  await user.click(
    screen.getByRole("button", { name: "Use a different printer" }),
  );
  await user.click(
    screen.getByRole("button", { name: "Remove and choose another" }),
  );
  await waitFor(() =>
    expect(m.push).toHaveBeenCalledWith(
      "/dashboard/printers/new?location=loc-1",
    ),
  );
});

it("keeps the printer and shows the error when removal fails", async () => {
  const user = userEvent.setup();
  m.remove.mockResolvedValue({ ok: false, error: "Nope" });
  render(<PrinterActions {...props} />);
  await user.click(screen.getByRole("button", { name: "Remove printer" }));
  await user.click(
    within(screen.getByRole("alertdialog")).getByRole("button", {
      name: "Remove printer",
    }),
  );
  await waitFor(() => expect(m.error).toHaveBeenCalledWith("Nope"));
  expect(m.push).not.toHaveBeenCalled();
  expect(m.refresh).not.toHaveBeenCalled();
});
