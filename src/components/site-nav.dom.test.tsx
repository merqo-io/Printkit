// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";

const signOutAction = vi.hoisted(() => vi.fn());
vi.mock("@/app/actions/auth", () => ({ signOutAction }));
vi.mock("@/app/actions/feedback", () => ({ submitFeedbackAction: vi.fn() }));
vi.mock("@/app/actions/support", () => ({
  submitSupportMessageAction: vi.fn(),
}));

vi.mock("@merqo/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@merqo/ui")>()),
  LandingNav: ({
    wordmark,
    end,
  }: {
    wordmark: React.ReactNode;
    end: React.ReactNode;
  }) => (
    <header>
      {wordmark}
      {end}
    </header>
  ),
}));

import { SiteNav } from "./site-nav";

it("puts the printkit wordmark, About and sign in in the shared nav", () => {
  render(<SiteNav />);
  expect(screen.getByRole("link", { name: "printkit home" })).toHaveAttribute(
    "href",
    "/dashboard",
  );
  expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
    "href",
    "/about",
  );
  expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/login",
  );
});

it("shows no account menu or Dashboard link when signed out", () => {
  render(<SiteNav />);
  expect(
    screen.queryByRole("button", { name: "Account menu" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "Dashboard" }),
  ).not.toBeInTheDocument();
});

it("swaps Sign in for Dashboard and the avatar menu when signed in", () => {
  render(<SiteNav account={{ name: "Ada Lovelace" }} />);
  expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
    "href",
    "/dashboard",
  );
  expect(
    screen.getByRole("button", { name: "Account menu" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "Sign in" }),
  ).not.toBeInTheDocument();
});

it("opens by touch and signs out", async () => {
  const user = userEvent.setup();
  render(<SiteNav account={{ name: "Ada Lovelace" }} />);
  await user.pointer({
    keys: "[TouchA]",
    target: screen.getByRole("button", { name: "Account menu" }),
  });
  const signOut = await screen.findByRole("menuitem", { name: /sign out/i });
  await user.pointer({ keys: "[TouchA]", target: signOut });
  expect(signOutAction).toHaveBeenCalledTimes(1);
});
