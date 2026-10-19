// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

vi.mock("@merqo/ui", () => ({
  AboutMerqo: ({
    kitName,
    children,
  }: {
    kitName: string;
    children: React.ReactNode;
  }) => (
    <article>
      <h1>About Merqo, for {kitName}</h1>
      {children}
    </article>
  ),
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
  Footer: ({ showSignIn }: { showSignIn?: boolean }) => (
    <footer>{showSignIn ? "sign-in shown" : "sign-in hidden"}</footer>
  ),
}));

import AboutPage from "./page";

it("tells the Merqo story for printkit and points at printer setup", () => {
  render(<AboutPage />);
  expect(
    screen.getByRole("heading", { name: "About Merqo, for printkit" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Set up a printer" }),
  ).toHaveAttribute("href", "/dashboard/printers");
  expect(screen.getByText("sign-in shown")).toBeInTheDocument();
});
