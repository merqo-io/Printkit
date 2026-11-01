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
  test: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}));
vi.mock("./actions", () => ({
  removePrinter: m.remove,
  sendTestPrint: m.test,
}));
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

it("moves focus to the heading, describes the consequences and closes the menu", async () => {
  const user = userEvent.setup();
  const { container } = render(<PrinterActions {...props} />);
  const menu = container.querySelector("details") as HTMLDetailsElement;
  menu.open = true;
  await user.click(screen.getByRole("button", { name: "Remove printer" }));
  const dialog = screen.getByRole("alertdialog");
  expect(menu.open).toBe(false);
  expect(screen.getByText(/Remove the printer from Stall/)).toHaveFocus();
  const described = dialog.getAttribute("aria-describedby") ?? "";
  expect(document.getElementById(described)).toHaveTextContent(/30 minutes/);
  expect(dialog).toHaveTextContent(/no printer until you set up a new one/);
});

it("cancels on Escape and returns focus to the More trigger", async () => {
  const user = userEvent.setup();
  render(<PrinterActions {...props} />);
  await user.click(screen.getByRole("button", { name: "Remove printer" }));
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(screen.getByText("More")).toHaveFocus();
  expect(m.remove).not.toHaveBeenCalled();
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

it("disables the test button while sending, then confirms", async () => {
  const user = userEvent.setup();
  let finish: (value: { ok: true; offline: boolean }) => void = () => {};
  m.test.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  render(<PrinterActions {...props} />);
  await user.click(screen.getByRole("button", { name: "Print test label" }));
  expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
  finish({ ok: true, offline: false });
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Test label sent. It should print in a few seconds.",
  );
  expect(m.test).toHaveBeenCalledWith("loc-1");
  expect(m.test).toHaveBeenCalledTimes(1);
});

it("says an offline printer will print when it is back online", async () => {
  const user = userEvent.setup();
  m.test.mockResolvedValue({ ok: true, offline: true });
  render(<PrinterActions {...props} />);
  await user.click(screen.getByRole("button", { name: "Print test label" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "It will print when the printer is back online.",
  );
});

it("shows the refusal or a failure of the test label", async () => {
  const user = userEvent.setup();
  m.test.mockResolvedValueOnce({ ok: false, error: "Wait a minute" });
  render(<PrinterActions {...props} />);
  await user.click(screen.getByRole("button", { name: "Print test label" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Wait a minute");
  m.test.mockRejectedValueOnce(new Error("network"));
  await user.click(screen.getByRole("button", { name: "Print test label" }));
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not send the test label. Please try again.",
    ),
  );
});
