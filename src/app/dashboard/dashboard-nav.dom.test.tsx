// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn().mockReturnValue("/dashboard"),
}));

import { DashboardNav } from "./dashboard-nav";

describe("DashboardNav", () => {
  it("renders the printkit wordmark and vendor name", () => {
    render(<DashboardNav signOut={vi.fn()} vendorName="Ada's Prints" />);
    expect(
      screen.getByRole("link", { name: "printkit dashboard home" }),
    ).toHaveTextContent("PrintKit");
    expect(screen.getAllByText("Ada's Prints").length).toBeGreaterThan(0);
  });

  it("links the avatar menu to the Bluetooth guide", async () => {
    const user = userEvent.setup();
    render(<DashboardNav signOut={vi.fn()} vendorName="Ada's Prints" />);
    await user.click(screen.getByRole("button", { name: "Account menu" }));
    expect(
      await screen.findByRole("menuitem", { name: "Bluetooth guide" }),
    ).toHaveAttribute("href", "/guides/bluetooth-printers");
  });
});
