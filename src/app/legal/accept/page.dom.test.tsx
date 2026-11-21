// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/actions/auth", () => ({ signOutAction: vi.fn() }));
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
vi.mock("./actions", () => ({ acceptLegalTerms: vi.fn() }));
import LegalAcceptPage from "./page";

describe("LegalAcceptPage", () => {
  it("renders the interstitial with a hidden safe-redirect next value", async () => {
    render(
      await LegalAcceptPage({
        searchParams: Promise.resolve({ next: "/admin" }),
      }),
    );
    expect(screen.getByText("Our terms have been updated")).toBeInTheDocument();
    const nextField = document.querySelector('input[name="next"]');
    expect(nextField).toHaveValue("/admin");
  });

  it("falls back to /dashboard for an unsafe next value", async () => {
    render(
      await LegalAcceptPage({
        searchParams: Promise.resolve({ next: "https://evil.example" }),
      }),
    );
    const nextField = document.querySelector('input[name="next"]');
    expect(nextField).toHaveValue("/dashboard");
  });

  it("gates submit on the checkbox and offers sign out as a separate form", async () => {
    render(await LegalAcceptPage({ searchParams: Promise.resolve({}) }));
    const submit = screen.getByRole("button", { name: "Accept and continue" });
    expect(submit).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox"));
    expect(submit).toBeEnabled();
    const signOut = screen.getByRole("button", { name: "Sign out instead" });
    expect(signOut).toBeEnabled();
    expect(signOut.closest("form")).not.toBe(submit.closest("form"));
  });
});
