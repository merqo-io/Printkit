// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { InfoButton } from "./info-button";
import { INFO_COPY } from "@/lib/printer-info-copy";
it("opens printer explanations on tap with the preserved touch target", async () => {
  const user = userEvent.setup();
  render(<InfoButton topic="ipad_alone" />);
  const trigger = screen.getByRole("button", {
    name: 'What does "Works with iPad alone" mean?',
  });
  expect(trigger).toHaveClass("size-6");
  expect(trigger).not.toHaveClass("size-4");
  await user.click(trigger);
  expect(
    await screen.findByText(INFO_COPY.ipad_alone.body),
  ).toBeInTheDocument();
  expect(screen.getByRole("dialog")).toHaveClass("text-foreground");
});
it("opens with the keyboard, dismisses on Escape and restores trigger focus", async () => {
  const user = userEvent.setup();
  render(<InfoButton topic="helper_device" />);
  const trigger = screen.getByRole("button", { name: /Needs a helper device/ });
  await user.tab();
  await user.keyboard("{Enter}");
  expect(
    await screen.findByText(INFO_COPY.helper_device.body),
  ).toBeInTheDocument();
  await user.keyboard("{Escape}");
  expect(
    screen.queryByText(INFO_COPY.helper_device.body),
  ).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});
it("grows to a 44px target on touch screens and opens by touch", async () => {
  const user = userEvent.setup();
  render(<InfoButton topic="ipad_alone" />);
  const trigger = screen.getByRole("button", {
    name: 'What does "Works with iPad alone" mean?',
  });
  expect(trigger).toHaveClass("pointer-coarse:size-11");
  await user.pointer({ keys: "[TouchA]", target: trigger });
  expect(
    await screen.findByText(INFO_COPY.ipad_alone.body),
  ).toBeInTheDocument();
});
