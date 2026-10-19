// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

vi.mock("@merqo/ui", () => ({
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

it("puts the printkit wordmark, About and the dashboard in the shared nav", () => {
  render(<SiteNav />);
  expect(screen.getByRole("link", { name: "printkit home" })).toHaveAttribute(
    "href",
    "/dashboard",
  );
  expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
    "href",
    "/about",
  );
  expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
    "href",
    "/dashboard",
  );
});
