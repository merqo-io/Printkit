// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

const footerProps = vi.fn();
vi.mock("@merqo/ui", () => ({
  Footer: (props: Record<string, unknown>) => {
    footerProps(props);
    return <footer>{props.wordmark as React.ReactNode}</footer>;
  },
}));

import { SiteFooter } from "./site-footer";

it("passes printkit's name and hides sign-in by default", () => {
  render(<SiteFooter />);
  expect(footerProps).toHaveBeenLastCalledWith(
    expect.objectContaining({ kitName: "printkit", showSignIn: false }),
  );
  expect(screen.getByRole("link", { name: "printkit home" })).toHaveAttribute(
    "href",
    "/dashboard",
  );
});
