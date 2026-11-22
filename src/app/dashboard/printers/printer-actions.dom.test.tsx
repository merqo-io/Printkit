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

async function pick(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole("button", { name: "More" }));
  await user.click(await screen.findByRole("menuitem", { name }));
}

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

it("opens a modal dialog that says what happens, then cancels", async () => {
  const user = userEvent.setup();
  render(<PrinterActions {...props} />);
  expect(screen.queryByRole("alertdialog")).toBeNull();
  await pick(user, "Remove printer");
  const dialog = await screen.findByRole("alertdialog");
  expect(dialog).toHaveTextContent("This printer will stop receiving orders.");
  expect(dialog).toHaveTextContent(/30 minutes/);
  expect(
    within(dialog).getByRole("button", { name: "Remove printer" }),
  ).toBeVisible();
  expect(m.remove).not.toHaveBeenCalled();
  await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(m.remove).not.toHaveBeenCalled();
});

it("removes the printer and refreshes the list", async () => {
  const user = userEvent.setup();
  m.remove.mockResolvedValue({ ok: true });
  render(<PrinterActions {...props} />);
  await pick(user, "Remove printer");
  await user.click(
    within(await screen.findByRole("alertdialog")).getByRole("button", {
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
  await pick(user, "Use a different printer");
  await user.click(
    screen.getByRole("button", { name: "Remove and choose another" }),
  );
  await waitFor(() =>
    expect(m.push).toHaveBeenCalledWith(
      "/dashboard/printers/new?location=loc-1",
    ),
  );
});

it("moves focus into the dialog and closes the menu", async () => {
  const user = userEvent.setup();
  render(<PrinterActions {...props} />);
  await pick(user, "Remove printer");
  const dialog = await screen.findByRole("alertdialog");
  expect(screen.queryByRole("menu")).toBeNull();
  expect(dialog).toContainElement(document.activeElement as HTMLElement);
  expect(dialog).toHaveAccessibleName(/Remove the printer from Stall/);
});

it("cancels on Escape and returns focus to the More trigger", async () => {
  const user = userEvent.setup();
  render(<PrinterActions {...props} />);
  await pick(user, "Remove printer");
  await screen.findByRole("alertdialog");
  await user.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "More" })).toHaveFocus(),
  );
  expect(m.remove).not.toHaveBeenCalled();
});

it("shows Removing… while the removal is pending", async () => {
  const user = userEvent.setup();
  m.remove.mockReturnValue(new Promise(() => {}));
  render(<PrinterActions {...props} />);
  await pick(user, "Remove printer");
  await user.click(
    within(await screen.findByRole("alertdialog")).getByRole("button", {
      name: "Remove printer",
    }),
  );
  expect(
    within(await screen.findByRole("alertdialog")).getByRole("button", {
      name: "Removing…",
    }),
  ).toBeDisabled();
});

it("keeps the printer and shows the error when removal fails", async () => {
  const user = userEvent.setup();
  m.remove.mockResolvedValue({ ok: false, error: "Nope" });
  render(<PrinterActions {...props} />);
  await pick(user, "Remove printer");
  await user.click(
    within(await screen.findByRole("alertdialog")).getByRole("button", {
      name: "Remove printer",
    }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("Nope");
  expect(screen.getByRole("alertdialog")).toBeVisible();
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

it("disables the test button and says the printer is offline", () => {
  render(<PrinterActions {...props} offline />);
  expect(
    screen.getByRole("button", { name: "Print test label" }),
  ).toBeDisabled();
  expect(screen.getByText(/printer is offline/i)).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Print test label" }),
  ).toHaveAccessibleDescription(/printer is offline/i);
});

it("opens the More menu by keyboard, closes on Escape and returns focus", async () => {
  const user = userEvent.setup();
  render(<PrinterActions {...props} />);
  const trigger = screen.getByRole("button", { name: "More" });
  expect(trigger).toHaveAttribute("aria-expanded", "false");

  trigger.focus();
  await user.keyboard("{Enter}");
  expect(await screen.findByRole("menu")).toBeVisible();
  expect(trigger).toHaveAttribute("aria-expanded", "true");

  await user.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  expect(trigger).toHaveFocus();
  expect(trigger).toHaveAttribute("aria-expanded", "false");
});

it("lists the menu links with their destinations", async () => {
  const user = userEvent.setup();
  render(<PrinterActions {...props} />);
  await user.click(screen.getByRole("button", { name: "More" }));
  expect(
    await screen.findByRole("menuitem", { name: "Design label" }),
  ).toHaveAttribute("href", "/dashboard/printers/designer?location=loc-1");
});
