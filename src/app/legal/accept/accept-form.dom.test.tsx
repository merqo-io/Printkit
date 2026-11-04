// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AcceptForm } from "./accept-form";

vi.mock("./actions", () => ({ acceptLegalTerms: vi.fn() }));
vi.mock("@/app/actions/auth", () => ({ signOutAction: vi.fn() }));

describe("AcceptForm", () => {
  it("carries the redirect target in a hidden field and disables submit until agreed", async () => {
    render(<AcceptForm next="/admin" />);
    const nextField = document.querySelector('input[name="next"]');
    expect(nextField).toHaveValue("/admin");
    const submit = screen.getByRole("button", { name: "Accept and continue" });
    expect(submit).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox"));
    expect(submit).toBeEnabled();
  });

  it("offers sign out as a separate form that needs no agreement", () => {
    render(<AcceptForm next="/admin" />);
    const signOut = screen.getByRole("button", { name: "Sign out instead" });
    expect(signOut).toBeEnabled();
    expect(signOut.closest("form")).not.toBe(
      screen
        .getByRole("button", { name: "Accept and continue" })
        .closest("form"),
    );
  });
});
